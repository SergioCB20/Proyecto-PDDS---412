# BC2 — Planificación y Replanificación

> **Spec owner:** PM/Lead  
> **Estado:** Draft v2  
> **Última actualización:** 27/05/2026  
> **Responsables:** Backend devs

---

## Propósito

Contiene la inteligencia del sistema. El `MotorEnrutamiento` calcula y recalcula rutas, evalúa capacidades contra umbrales configurables y maneja cancelaciones agrupando los equipajes afectados en lotes. Su pieza central es `SesionEjecucion`, una abstracción que unifica dos modos de operación: **en vivo** (siguiendo vuelos y equipajes reales) y **simulada** (proyectando escenarios sobre el `PlanVuelos`). Ambos modos pueden correr en paralelo sin interferirse.

---

## Aggregate Roots

| Aggregate Root | Descripción |
|---|---|
| `SesionEjecucion` | Unidad central. Puede ser SIMULADA o EN_VIVO. Contiene umbrales, métricas en vivo y ciclo de vida. |
| `EventoCancelacion` | Registra la cancelación de un vuelo dentro de una sesión. |
| `LoteReplanificacion` | Agrupa los equipajes afectados por una cancelación para replanificarlos juntos. |
| `ReporteSesion` | Reporte final generado al finalizar una sesión. Inmutable una vez creado. |

---

## Entidades internas

| Entidad | Aggregate Root dueño | Descripción |
|---|---|---|
| `ItemLote` | `LoteReplanificacion` | Equipaje individual dentro de un lote de replanificación. |
| `PuntoSLA` | `ReporteSesion` | Punto de la serie temporal SLA vs Tiempo para el gráfico del reporte. |

---

## Value Objects

| Value Object | Dónde se usa | Descripción |
|---|---|---|
| `UmbralCapacidad` | `SesionEjecucion` | Define rangos verde/ámbar/rojo para almacén y vuelos. |
| `MetricasEnVivo` | `SesionEjecucion` (en Redis) | Snapshot de métricas actualizadas en cada tick. |

---

## Domain Events escuchados

| Evento | Origen | Acción al recibirlo |
|---|---|---|
| `EquipajeIngresado` | BC1 | Llamar al `MotorEnrutamiento` y crear el `PlanViaje`. |
| `VueloCancelado` | BC1 | Identificar equipajes afectados, crear `LoteReplanificacion`, replanificar. |

## Domain Events publicados

| Evento | Cuándo | Consumidor |
|---|---|---|
| `PlanViajeCreado` | Tras calcular ruta exitosamente | BC1 — para persistir el plan |
| `ReplanificacionIniciada` | Al crear el lote y comenzar a procesar | Auditoría / Telemetría |
| `SesionFinalizada` | Al completar o detener una sesión | Auditoría |

---

## Motor de Enrutamiento (Application Service)

### Arquitectura desacoplada (Strategy Pattern)

El enrutamiento se divide en dos capas:

```
MotorEnrutamiento (@Service)         → Orquestador: controla tiempo, consulta BD
    └── RoutingStrategy (interface)   → Abstracción pura del algoritmo
            └── GreedyRoutingStrategy  → Algoritmo greedy concreto (sin repos, sin Spring)
```

### `MotorEnrutamiento` — Orquestador

`@Service` que inyecta ambas estrategias de routing. Controla el acceso a repositorios y delega el cálculo:

```java
RutaResult calcularRuta(NodoLogistico origen, String destinoIata, OffsetDateTime slaComprometido)
List<RutaResult> calcularRutasLote(List<Equipaje> equipajes)
```

1. **Modo single-item:** delega en `GreedyRoutingStrategy` (`@Qualifier("greedyRoutingStrategy")`)
2. **Modo batch:** delega en `ACORoutingStrategy` (`@Qualifier("acoRoutingStrategy")`) con TiempoInterno derivado del equipoje

Flujo:
```
calcularRuta() → GreedyRoutingStrategy.calcularRuta()  (1 item, determinista)
calcularRutasLote() → ACORoutingStrategy.optimizarLote()  (N items, estocástico)
```

### `RoutingStrategy` — Interfaz del algoritmo

Contrato puro sin dependencias de infraestructura:

```java
public interface RoutingStrategy {
    RutaResult calcularRuta(
        NodoLogistico origen,
        NodoLogistico destino,
        OffsetDateTime slaComprometido,
        List<Vuelo> vuelosProgramados   // ← datos ya resueltos por el motor
    );

    // Batch support (default: false, single-item loop)
    default boolean soportaBatch() { return false; }

    default List<RutaResult> optimizarLote(
        List<ParametroRuta> parametros,
        List<Vuelo> vuelosProgramados,
        TiempoInterno tiempoSimulado
    ) { /* fallback: single-item loop */ }

    record ParametroRuta(NodoLogistico origen, NodoLogistico destino,
                         OffsetDateTime slaComprometido) {}
}
```

### `GreedyRoutingStrategy` — Implementación concreta

Algoritmo greedy (para esta entrega):

```
1. Buscar vuelo directo desde origen → destino
   con carga_disponible > 0 y llegada ≤ SLA
2. Si existe → retornar 1 segmento
3. Si no → buscar combinación de 2 vuelos (origen → escala → destino)
   con mínimo 60 min entre conexión y llegada ≤ SLA
4. Si no hay ruta → retornar RutaResult con error
```

**Características:**
- `@Component` sin dependencias a repositorios ni Spring (excepto la anotación)
- No sabe de BD, sesiones, tiempo virtual ni simulación
- Solo recibe datos ya resueltos y retorna rutas
- Testeable sin mocks (solo construir datos)

#### `ACORoutingStrategy` — Implementación batch (Ant Colony Optimization)

Adaptación del algoritmo ACO v2 (del legado `com/gats/`) al modelo actual. `@Qualifier("acoRoutingStrategy")`.

**Características:**
- `soportaBatch() = true`: procesa todo el lote en cada optimización
- Construye grafo en memoria desde `List<Vuelo>` (nodos = aeropuertos, aristas = vuelos)
- Ordena maletas por urgencia SLA (menor tiempo máximo primero)
- BFS de alcanzabilidad: antes de elegir un vuelo, verifica que exista camino al destino final
- Feromonas: evaporación (ρ=0.2), depósito diferenciado, tauMin/tauMax para evitar estancamiento
- Élitismo: la mejor solución global deposita `eliteFactor × depósito normal`
- SLA gradual: penalidad proporcional a horas de retraso, no colapso binario

**Diferencias con el greedy:**
- Greedy: 1 item a la vez, determinista, `soportaBatch() = false`
- ACO: lote completo, estocástico, `soportaBatch() = true`

### `TiempoInterno` — Conversión de tiempo virtual

Record que convierte `OffsetDateTime` al sistema de tiempo interno de los algoritmos heredados:

```java
record TiempoInterno(int horaDelDia, int dia) {
    static TiempoInterno desde(OffsetDateTime fecha, OffsetDateTime referencia) { ... }
    int totalHoras() { ... }
}
```

## Records de resultado

Ambos records viven como top-level en `bc2/application/`:

```java
record SegmentoInfo(int orden, UUID vueloId, String vueloCodigo,
                    UUID nodoOrigenId, String nodoOrigenIata,
                    UUID nodoDestinoId, String nodoDestinoIata,
                    OffsetDateTime horaSalida, OffsetDateTime horaLlegada) {}

record RutaResult(List<SegmentoInfo> segmentos, boolean exitoso, String mensajeError) {
    static RutaResult sinRuta(String error) { ... }
}
```

### Evaluación de umbrales

```java
String evaluarColor(double ocupacionPct, UmbralCapacidad umbral) {
    if (ocupacionPct <= umbral.verdeMax) return "VERDE";
    if (ocupacionPct <= umbral.ambarMax) return "AMBAR";
    return "ROJO";
}
```

---

## Reglas de negocio

### Sesión de ejecución
- Solo puede existir **una sesión EN_VIVO activa** a la vez.
- Pueden existir múltiples sesiones SIMULADAS corriendo en paralelo.
- Una sesión SIMULADA no afecta el estado real de vuelos ni equipajes.
- Al iniciar una sesión SIMULADA, se carga el `PlanVuelos` como fuente de datos virtuales.
- Una sesión no puede reiniciarse una vez FINALIZADA o COLAPSADA.

### Tick de simulación
- El tick avanza el reloj virtual según el factor de escala (120 horas en 30-90 min reales).
- En cada tick:
  1. Avanzar `dia_hora_virtual`.
  2. Detectar vuelos que deben salir o llegar según el reloj virtual.
  3. Actualizar estados de equipajes (`EN_ALMACEN` → `EN_VUELO` → `EN_ALMACEN`).
  4. Evaluar probabilidad de cancelación (`prob_cancelacion`) y generar cancelaciones aleatorias.
  5. Actualizar `MetricasEnVivo` en Redis.
  6. Registrar un `PuntoSLA` cada hora virtual.

### Replanificación
- Al recibir `VueloCancelado`:
  1. Buscar todos los `SegmentoPlan` que referencian ese vuelo con estado `PENDIENTE` o `EN_CURSO`.
  2. Obtener los `Equipaje` asociados.
  3. Cambiar su estado a `EN_REPLANIFICACION`.
  4. Crear un `LoteReplanificacion` y sus `ItemLote`.
  5. Para cada `ItemLote`, llamar al motor y obtener nueva ruta.
  6. Si nueva ruta respeta el SLA → estado `ENRUTADO`.
  7. Si nueva ruta supera el SLA → estado `INCUMPLIMIENTO_SLA`.
  8. Incrementar `maletas_replanificadas` en las métricas.

### Reporte final
- Se genera automáticamente al finalizar los 5 días virtuales o al detectar colapso.
- `sla_incumplido_pct` = (equipajes con INCUMPLIMIENTO_SLA / total equipajes) * 100.
- `serie_sla` = lista de `PuntoSLA` ordenados por `momento_virtual`.
- Si hubo cancelación en un tick, `hubo_cancelacion = true` en ese `PuntoSLA`.

---

## Estados de SesionEjecucion

```
CONFIGURADA → EN_CURSO → FINALIZADA
                ↓
             PAUSADA → EN_CURSO
                ↓
             COLAPSADA
```

---

## Redis — claves escritas por BC2

| Clave | Valor | Cuándo |
|---|---|---|
| `sesion:{id}:metricas` | JSON de MetricasEnVivo | Cada tick |
| `sesion:{id}:estado` | String del estado | Al cambiar estado |
| `nodo:{id}:ocupacion` | INT actualizado | Al replanificar (ajusta ocupación) |
| `vuelo:{id}:carga_disponible` | INT actualizado | Al replanificar (libera y reasigna carga) |

---

## Paquete Java

```
com.tasfb2b.backend.bc2/
├── domain/
│   ├── SesionEjecucion.java
│   ├── EventoCancelacion.java
│   ├── LoteReplanificacion.java
│   ├── ItemLote.java
│   ├── ReporteSesion.java
│   └── PuntoSLA.java
├── application/
│   ├── SesionService.java              ← crear, iniciar, pausar, detener sesión
│   ├── TickService.java                ← lógica del reloj virtual y tick
│   ├── ReplanificacionService.java     ← escucha VueloCancelado, gestiona lotes
│   ├── ReporteService.java             ← genera ReporteSesion al finalizar
│   ├── RoutingStrategy.java            ← interfaz del algoritmo (Strategy)
│   ├── GreedyRoutingStrategy.java      ← algoritmo greedy (Strategy impl)
│   ├── RutaResult.java                 ← record de resultado
│   ├── SegmentoInfo.java               ← record de segmento
│   └── MotorEnrutamiento.java          ← orquestador (delega en RoutingStrategy)
└── infrastructure/
    ├── SesionRepository.java
    ├── EventoCancelacionRepository.java
    ├── LoteReplanificacionRepository.java
    ├── ItemLoteRepository.java
    ├── ReporteSesionRepository.java
    ├── PuntoSLARepository.java
    ├── SesionController.java           ← POST /sesiones, /iniciar, /pausar, /detener
    └── MetricasController.java         ← GET /sesiones/{id}/metricas, /reporte
```

---

## Integración con BC1

BC2 se comunica con BC1 **únicamente mediante eventos internos de Spring Boot**:

```java
// BC1 publica:
applicationEventPublisher.publishEvent(new EquipajeIngresadoEvent(equipajeId));
applicationEventPublisher.publishEvent(new VueloCanceladoEvent(vueloId));

// BC2 escucha:
@EventListener
public void onEquipajeIngresado(EquipajeIngresadoEvent event) { ... }

@EventListener
public void onVueloCancelado(VueloCanceladoEvent event) { ... }
```

Los eventos compartidos viven en `com.tasfb2b.backend.shared.events/`.
