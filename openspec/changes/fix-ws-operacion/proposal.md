## Why

El WebSocket de telemetría de la operación en vivo no se mantiene conectado porque el `OperacionTickService` ejecuta un `UPDATE` masivo de reseteo de vuelos en cada tick (cada 5s), que tarda 40-55 segundos. Esto impide que `emitirTelemetria()` se ejecute con frecuencia, dejando el WebSocket sin datos por ventanas >60s, lo que provoca que Nginx cierre la conexión por `proxy_read_timeout`.

## What Changes

- **Separar el reseteo de vuelos del tick principal**: el reseteo (`resetearInstanciasPorFecha`/`clonarPlantillas`) solo corre una vez por día (cuando cambia la fecha), no en cada ciclo del scheduler.
- **Cambiar `@Scheduled(fixedRate = 5000)` a `@Scheduled(fixedDelay = 1000)`** para evitar ticks solapados que compiten por la misma transacción.
- **Emitir telemetría con `@Async`** para que nunca bloquee el tick aunque un cliente WebSocket esté lento.
- **Agregar heartbeat automático en `TelemetriaWebSocket`** cada 10 segundos para mantener la conexión activa incluso en periodos sin telemetría.
- **Agregar `proxy_read_timeout 3600s` en Nginx** para evitar que cierre conexiones WebSocket long-lived.
- **Filtrar heartbeats en el frontend** para ignorar mensajes de tipo `heartbeat`.

## Capabilities

### New Capabilities
- `ws-heartbeat`: Mecanismo de heartbeat automático en el WebSocket de telemetría para mantener la conexión activa permanentemente.

### Modified Capabilities
- `bc1-gestion-operativa`: El ciclo de tick de operación (`OperacionTickService`) cambia su lógica de reseteo para ejecutarse solo una vez por día, y su scheduler cambia de `fixedRate` a `fixedDelay`. Se agrega `@Async` a la emisión de telemetría.

## Impact

- **Backend**: `OperacionTickService.java`, `OperacionTelemetriaService.java`, `TelemetriaWebSocket.java`
- **Frontend**: `useTelemetria.ts` (filtrar heartbeats)
- **Infraestructura**: Nginx config en servidor (`proxy_read_timeout`)
