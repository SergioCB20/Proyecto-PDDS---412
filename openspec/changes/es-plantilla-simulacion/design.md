## Context

Los vuelos semilla cargados por `V20__seed_nodos_vuelos.sql` (~2800 vuelos) representan un **patrón de 24 h** con distribución uniforme (~120 vuelos/hora). Son la plantilla de horarios, no instancias de simulación con fecha concreta. Sin embargo, residen en la misma tabla `vuelos` que los vuelos generados para la simulación, y hasta ahora no existía ningún mecanismo para distinguirlos.

Cuando una simulación se inicia en `2026-01-15` (fecha de la plantilla), los vuelos semilla coinciden en fecha con los vuelos generados, resultando en 5600 vuelos PROGRAMADO el primer día (2800 semilla + 2800 generados). Las queries del tick procesan ambos conjuntos.

## Decisions

| Decisión | Opción elegida | Alternativa descartada |
|---|---|---|
| **Separación plantilla/simulación** | Campo `es_plantilla boolean` en `vuelos` | Mover plantilla a tabla separada (más complejidad de migración y consultas) |
| **Generación diaria** | Clonar desde plantilla al entrar a nuevo día virtual | Generar 5 días al inicio de la sesión (menos control sobre el momento de generación) |
| **Evitar regeneración en mismo día** | `HashMap<UUID, LocalDate>` en memoria por sesión | Guardar último día generado en `sesiones_ejecucion` (cambio en esquema) |
| **Auto‑stop** | `excedeLimiteTiempo()` chequea si `dia_hora_virtual > inicio + 5 días` | Timer externo (más complejo, innecesario) |
| **Telemetría** | Solo enviar `EN_RUTA` | Seguir enviando `PROGRAMADO` y filtrar en frontend (descartado por sobrecarga de datos) |

## Detailed design

### `Vuelo.esPlantilla`

```java
@Column(name = "es_plantilla")
private boolean esPlantilla = false;
```

- `true` para vuelos semilla (2026-01-15)
- `false` (default) para vuelos generados por simulación
- Flyway V23 asigna `es_plantilla = true` a los vuelos con `hora_salida` entre `2026-01-15T00:00:00Z` y `2026-01-16T00:00:00Z`

### `VueloRepository` — nuevos métodos

```java
// Template query (solo plantilla)
List<Vuelo> findByEstadoAndHoraSalidaBetweenAndEsPlantilla(
    EstadoVuelo estado, OffsetDateTime desde, OffsetDateTime hasta, boolean esPlantilla);

// Todas las queries de simulación filtran esPlantilla = false
List<Vuelo> findByEstadoAndEsPlantilla(EstadoVuelo estado, boolean esPlantilla, Pageable pageable);
List<Vuelo> findByEstadoAndHoraSalidaLessThanEqualAndEsPlantilla(EstadoVuelo estado, OffsetDateTime hora, boolean esPlantilla);
List<Vuelo> findByEstadoAndHoraLlegadaLessThanEqualAndEsPlantilla(EstadoVuelo estado, OffsetDateTime hora, boolean esPlantilla);
List<Vuelo> findByEstadoInAndEsPlantilla(List<EstadoVuelo> estados, boolean esPlantilla);
```

### `TickService.generarVuelosSiEsNecesario()`

```
generarVuelosSiEsNecesario(sesion):
  si diaHoraVirtual es null → return

  fechaActual = diaHoraVirtual.toLocalDate()
  si fechaActual == ultimoDiaGeneradoPorSesion[sesion.id] → return  // ya generado para este día

  templates = findByEstadoAndHoraSalidaBetweenAndEsPlantilla(PROGRAMADO, inicioBase, finBase, true)
  si templates vacía → return

  para cada template t:
    crear nuevo Vuelo v:
      v.esPlantilla = false
      v.horaSalida = OffsetDateTime.of(fechaActual, t.horaSalida.toLocalTime(), UTC)
      v.horaLlegada = OffsetDateTime.of(fechaActual, t.horaLlegada.toLocalTime(), UTC)
      // copiar resto de campos (codigo, ruta, capacidad) desde t
    persistir v

  ultimoDiaGeneradoPorSesion[sesion.id] = fechaActual
```

**Puntos clave:**
- Solo clona vuelos con `es_plantilla = true AND estado = PROGRAMADO` (la plantilla original nunca se modifica)
- La fecha se toma del reloj virtual, la hora del patrón de la plantilla — no hay desplazamiento de días
- El `HashMap` evita regenerar en ticks sucesivos del mismo día virtual
- Tras reinicio del servidor, el mapa se pierde y se regeneraría — caso borde aceptable para entorno académico

### Auto‑stop

```java
excedeLimiteTiempo(sesion):
  si diaHoraVirtual es null → false
  inicio = OffsetDateTime.of(fechaInicioVirtual, horaInicioVirtual, UTC)
  limite = inicio.plusDays(5)
  return diaHoraVirtual.isAfter(limite)

detenerSesionPorTiempo(sesion, now):
  estado = FINALIZADA
  fechaFinReal = now
  publicar SesionFinalizada("FINALIZADA_POR_TIEMPO")
  escribir métricas en Redis
  telemetriaService.emitirTelemetria(sesion)
  ultimoDiaGeneradoPorSesion.remove(sesion.id)
```

### Flujo completo del tick

```
procesarTick(sesion):
  1. avanzarRelojVirtual()          → +20 min virtuales (~10 s reales)
  2. generarVuelosSiEsNecesario()   → clonar plantilla si nuevo día
  3. si excedeLimiteTiempo()        → detenerSesionPorTiempo(), return
  4. simuladorBaggageFeeder()       → inyectar equipajes desde staging
  5. procesarVuelosSalida()         → PROGRAMADO → EN_RUTA (solo esPlantilla=false)
  6. procesarVuelosLlegada()        → EN_RUTA → COMPLETADO (solo esPlantilla=false)
  7. evaluarCancelaciones()         → cancelación probabilística
  8. detectarColapso()              → verificar umbrales
  9. escribirMetricas()             → Redis
  10. telemetriaService()           → emitir solo EN_RUTA a WebSocket
```

### `MotorEnrutamiento` — exclusión de plantilla

```java
// Antes:
List<Vuelo> programados = vueloRepository.findByEstado(PROGRAMADO, unpaged).getContent();

// Después:
List<Vuelo> programados = vueloRepository.findByEstadoAndEsPlantilla(PROGRAMADO, false, unpaged).getContent();
```

## Risks / Trade-offs

- **[Riesgo bajo] Reinicio del servidor**: el `HashMap` de días generados se pierde. Si una sesión estaba en curso, el primer tick post‑reinicio regeneraría vuelos para el día actual → duplicados. Mitigación: entorno académico sin HA, reinicio implica reiniciar sesiones.
- **[Riesgo bajo] Sesiones en paralelo**: cada sesión tiene su entrada en el `HashMap`. No hay interferencia entre sesiones.
- **[Trade-off] 2800 vuelos/día**: generar 2800 vuelos por cada día virtual (5 días = 14 000 vuelos) es aceptable para una base PostgreSQL sin índices pesados.
- **[Trade-off] Consultas sin paginación**: `findByEstadoAndHoraSalidaLessThanEqualAndEsPlantilla` retorna todos los PROGRAMADO hasta el tiempo virtual. En el peor caso (~2800/día × 5 días = 14 000 registros). Aceptable para alcance académico.
