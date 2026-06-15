# Propuesta: Simulación 5D Completamente Funcional

> **Fecha:** 2026-06-15  
> **Estado:** En implementación  
> **Responsable:** Backend  

---

## Contexto

### ¿Qué existe hoy?

El backend tiene los siguientes componentes de simulación implementados:

| Componente | Archivo | Función |
|---|---|---|
| `TickService` | bc2/application | Corre cada 5s. Avanza reloj virtual, clona vuelos por día, detecta salidas/llegadas, evalúa cancelaciones probabilísticas |
| `SimulacionPlanificador` | bc2/application | Corre cada `sa-segundos` (global, default 30s). Llama al ACO para rutar bolsas de la ventana virtual actual |
| `SimulacionEnrutamientoService` | bc2/application | Recibe ventana [inicio, fin] de tiempo virtual. Consulta bolsas `REGISTRADO` con `fecha_operacion` en ese rango. Ejecuta ACO batch y crea PlanViaje + SegmentoPlan |
| `CargaSimulacionRunner` | bc1/application | Al arrancar el servidor, carga todos los archivos `_envios_*.txt` en la tabla `equipajes` con sus fechas reales |
| `SesionService` | bc2/application | Crea, inicia, pausa, detiene sesiones. Al iniciar: clona vuelos del día 1 y crea ReporteSesion |

### Datos disponibles

Los archivos `_envios_XXXX_.txt` contienen bolsas con fechas de **2026-01-02 a 2029-01-05** (~1095 días). El volumen escala dramáticamente:
- 2026-01-02: ~488 bolsas totales (todos los nodos)  
- 2028-01-01: ~8.000 bolsas/día  
- 2029-01-05: ~16.000+ bolsas/día  

Esto ya representa el escalado requerido por el negocio.

---

## Bugs Críticos Identificados

### BUG 1: Desalineación de fechas (bloquea toda la simulación)

**Síntoma:** `SimulacionPlanificador.ejecutarPlanificacion()` consulta bolsas con:
```sql
WHERE estado = 'REGISTRADO' AND fecha_operacion >= ? AND fecha_operacion < ?
```
Usando `virtual = sesion.getDiaHoraVirtual()`. Si el analista crea la sesión con `fecha_inicio_virtual = "2025-06-01"`, el reloj virtual produce timestamps `2025-06-01T08:00:00Z`, pero las bolsas en BD tienen `fecha_operacion = 2026-01-02T...`. → **0 bolsas rutadas, simulación vacía**.

**Fix:** En `prepararInstanciasSimulacion`, calcular el offset de días entre `fechaInicioVirtual` de la sesión y la fecha base del archivo (`2026-01-02`), y aplicar ese offset a todos los `equipajes.fecha_operacion` con un UPDATE JDBC.

Ejemplo: si sesión tiene `fecha_inicio_virtual = "2026-01-02"` → offset=0, sin cambio. Si `fecha_inicio_virtual = "2025-06-01"` → offset = -215 días, UPDATE resta 215 días a todas las fechas.

### BUG 2: `k` es global, no configurable por sesión

**Síntoma:** `TickService` inyecta `@Value("${app.simulacion.k}")`. No se puede definir un ratio tiempo_virtual/tiempo_real diferente por sesión.

**Fix:** Agregar campo `k DOUBLE` en `SesionEjecucion` (default 120). `TickService` lee `sesion.getK()` en cada tick.

Con k=120 y tick=5s: 5 días = 3600s real (60 min)  
Con k=240 y tick=5s: 5 días = 1800s real (30 min)  
Rango requerido: 30-60 min → k entre 120 y 240.

### BUG 3: `sa_segundos` (salto del algoritmo) es global y no se puede variar por sesión

**Síntoma:** `SimulacionPlanificador` usa `@Scheduled(fixedDelayString = "${app.simulacion.sa-segundos}000")`. No puede variar por sesión.

**Fix:** Cambiar a `@Scheduled(fixedDelay = 5000)` (cada 5 segundos como el tick). Dentro del método, rastrear en un `ConcurrentHashMap<UUID, Long>` el `lastPlanificacionMs` de cada sesión. Solo ejecutar si `now - lastPlanificacion >= sesion.getSaSegundos() * 1000`.

### BUG 4: Simulación nunca termina automáticamente

**Síntoma:** `TickService` no tiene lógica de finalización por tiempo virtual. La sesión solo termina si: (a) usuario llama `/detener`, (b) se detecta colapso de almacén.

**Fix:** En `TickService.procesarTick`, después de avanzar el reloj, verificar:
```java
LocalDate fin = sesion.getFechaInicioVirtual().plusDays(5);
if (!sesion.getDiaHoraVirtual().toLocalDate().isBefore(fin)) {
    finalizarSesionAutomaticamente(sesion, now);
}
```

### BUG 5: Query `findBySesionIdAndEstadoAndNodoIata` rota para EN_ALMACEN

**Síntoma:** Para estado `EN_ALMACEN`, `vueloActual` es `null`. La query JPQL `e.vueloActual.destino.codigoIata = :nodoIata` filtra todo (inner join sobre null = sin resultados).

**Fix:** Cambiar la query para buscar por `origenIata` o por el destino del último segmento COMPLETADO.

---

## Plan de Implementación

### Archivos a crear

| Archivo | Descripción |
|---|---|
| `V34__add_k_simulacion_fija.sql` | Columnas `k`, `sa_segundos` en `sesiones_ejecucion` |

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `SesionEjecucion.java` | Campos `k` (Double, default 120), `saSegundos` (Integer, default 30) |
| `CrearSesionRequest.java` | Params `k`, `sa_segundos` (opcionales) |
| `SesionService.crearSesion` | Setear k y saSegundos desde request |
| `SesionService.prepararInstanciasSimulacion` | Alineación de fechas con JDBC UPDATE |
| `TickService` | (1) Leer k desde sesión; (2) Auto-finalizar al llegar a 5 días virtuales |
| `SimulacionPlanificador` | Cambiar scheduler a 5s con lógica per-sesión de saSegundos |
| `EquipajeRepository` | Fix query EN_ALMACEN por nodo |
| `api-contracts.md` | Documentar `k` y `sa_segundos` en POST /sesiones |
| `bc2-planificacion-replanificacion.md` | Actualizar con parámetros de planificación fija |

---

## Invariantes de la simulación 5D

- Siempre exactamente **5 días virtuales** (hardcoded, no configurable)
- Duración real: **30 a 60 minutos** → k entre 120 y 240
- Tick del reloj virtual: fijo **5 segundos** reales
- Avance virtual por tick: `(5 × k) / 60` minutos virtuales
- Salto del planificador ACO: `sa_segundos` reales (default 30s, configurable por sesión)
- Ventana de planificación: `ventana_horas` horas virtuales (default 4h, ya configurable)
- Las bolsas se cargan al inicio del servidor (CargaSimulacionRunner) y se re-alinean al iniciar cada sesión
