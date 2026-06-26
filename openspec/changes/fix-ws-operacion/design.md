## Context

El módulo de operación en vivo (`bc1`) emite telemetría vía WebSocket cada tick del `OperacionTickService` (cada 5s). Sin embargo, el tick ejecuta un `UPDATE` masivo (`resetearInstanciasPorFecha`) que tarda 40-55 segundos en completarse debido al tamaño de la tabla `vuelos` (~51k instancias). Esto provoca que:

1. Los ticks se solapen (fixedRate=5000ms con ejecución de 40-55s).
2. `emitirTelemetria()` solo se ejecute cada ~50s, dejando el WebSocket sin datos por largos períodos.
3. Nginx (`proxy_read_timeout` default 60s) cierre la conexión WebSocket por inactividad.
4. El cliente se desconecte y reconecte cada ~64s en un ciclo infinito.

## Goals / Non-Goals

**Goals:**
- El WebSocket de telemetría debe mantenerse conectado permanentemente durante la operación en vivo.
- La telemetría debe fluir al menos cada 10 segundos (idealmente cada 1-2s).
- El reseteo de vuelos debe ocurrir solo cuando sea necesario (una vez por día), no en cada tick.
- Los ticks no deben solaparse para evitar contención de base de datos.

**Non-Goals:**
- No se modifica el módulo de simulación (`bc2`).
- No se agregan nuevas capacidades de telemetría (solo se asegura la conexión).
- No se modifica el formato del mensaje de telemetría existente.

## Decisions

### D1: De fixedRate(5000) a fixedDelay(1000) en OperacionTickService
- **Decisión**: Cambiar `@Scheduled(fixedRate = 5000)` a `@Scheduled(fixedDelay = 1000)`.
- **Alternativa**: Usar `Lock` o semáforo para evitar solapamiento manteniendo fixedRate.
- **Razón**: `fixedDelay` garantiza que nunca haya dos ticks ejecutándose concurrentemente, eliminando la contención de BD. Con el reseteo fuera del tick, la ejecución será < 1s, por lo que fixedDelay=1s da una frecuencia de ~1s entre emisiones de telemetría.

### D2: Reseteo una vez por día vía flag diaProcesado
- **Decisión**: Agregar `diaProcesado: LocalDate` que se compara con `today` para decidir si resetear/clonar.
- **Alternativa**: Ejecutar reseteo en un `@PostConstruct` o en un scheduler separado.
- **Razón**: El flag en memoria es simple, no requiere nuevas tablas ni configuraciones. Cuando `today != diaProcesado` (primer tick del día o día cruzado), se ejecuta el reseteo/clonado una sola vez.

### D3: emitirTelemetria() con @Async
- **Decisión**: Marcar `emitirTelemetria()` con `@Async` para que el broadcast WebSocket no bloquee el tick.
- **Alternativa**: Usar `TaskExecutor` manual o `CompletableFuture.runAsync`.
- **Razón**: `@EnableAsync` ya está presente en `BackendApplication.java`. `@Async` es la forma más simple y declarativa. Si un cliente WebSocket está lento, el broadcast no retrasa el siguiente tick.

### D4: Heartbeat automático en TelemetriaWebSocket
- **Decisión**: Agregar `@Scheduled(fixedRate = 10000)` en `TelemetriaWebSocket` que emite `{"type":"heartbeat"}` si hay sesiones conectadas.
- **Alternativa**: Confiar solo en la telemetría periódica.
- **Razón**: Red de seguridad. Si por alguna razón el tick se retrasa (carga del sistema, query lenta), el heartbeat mantiene la conexión viva. Nginx nunca ve >10s de silencio.

### D5: proxy_read_timeout 3600s en Nginx
- **Decisión**: Agregar `proxy_read_timeout 3600s;` en el bloque `location /back/`.
- **Alternativa**: Usar `proxy_read_timeout 10m` o no cambiarlo.
- **Razón**: 3600s (1h) es más que suficiente para cualquier sesión de operación. Si la conexión se cae por otras razones, el frontend reconecta automáticamente en 3s.

## Risks / Trade-offs

- **[Tick lento por query inesperada]** → El heartbeat (cada 10s) mantiene la conexión aunque el tick demore.
- **[Reseteo salta un día por cambio de UTC]** → El flag `diaProcesado` usa `LocalDate` UTC, que cambia a las 19:00 Peru time. Es correcto porque la operación usa UTC.
- **[@Async sin límite de threads]** → Por defecto Spring crea un `SimpleAsyncTaskExecutor` ilimitado. Para broadcasts cada 1-2s no es problema, pero podría acumularse si hay muchos clientes lentos.
