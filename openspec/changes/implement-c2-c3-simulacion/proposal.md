## Why

La simulación de escenarios logísticos en la sección `/simulacion` tiene dos problemas: (1) el ID de sesión en la URL es un valor fake generado con `Math.random()` en vez de usar el UUID real devuelto por `POST /api/sesiones`; y (2) la telemetría se obtiene simultáneamente por WebSocket y polling cada 3s, lo que duplica tráfico y procesamiento.

## What Changes

- **C2**: Modificar `simulacion/page.tsx` para que `handleIniciar` llame a `POST /api/sesiones` y redirija con el UUID real. Modificar `simulacion/[id]/page.tsx` para leer `params.id` en lugar de ignorarlo.
- **C3**: Modificar `simulacion/[id]/page.tsx` para que el polling (`setInterval fetchMetricas`) solo se active como fallback cuando el WebSocket está desconectado, usando el `connected` que ya retorna `useTelemetria`.

## Capabilities

### New Capabilities
- `sesion-id-real`: Crear sesiones de simulación contra el backend y usar el UUID real en la URL en lugar de un ID fake.

### Modified Capabilities
- `sse-frontend-consumo`: El consumo de telemetría ahora prioriza WebSocket y usa polling solo como fallback cuando WS está desconectado, en lugar de ejecutar ambos simultáneamente.

## Impact

- `frontend/app/simulacion/page.tsx` — `handleIniciar` se vuelve async, llama a `POST /api/sesiones`
- `frontend/app/simulacion/[id]/page.tsx` — importa `useParams`, lee `params.id`, elimina `FALLBACK_SIM_ID`
- `frontend/app/simulacion/[id]/page.tsx` — agrega `connected` como dependencia del `useEffect` de polling
