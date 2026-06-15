## Why

El panel de vuelos en la vista de simulación en vivo muestra la lista de vuelos pero sin posibilidad de ordenarlos. El usuario (analista) necesita poder ordenar los vuelos por distintos criterios (ocupación, hora, origen, destino) para analizar rápidamente la situación operativa.

## What Changes

- **Backend:** Agregar campos `hora_salida` y `hora_llegada` al JSON de telemetría de vuelos para que el frontend pueda ordenar por hora.
- **Frontend:** Agregar dropdown de ordenamiento en `PanelVuelos` con opciones: ocupación (asc/desc), hora salida, hora llegada, origen (A-Z), destino (A-Z).

## Capabilities

### New Capabilities
- `ordenamiento-vuelos`: Capacidad de ordenar la lista de vuelos en la simulación por múltiples criterios.

### Modified Capabilities
- `sse-frontend-consumo`: Se agregan campos `hora_salida` y `hora_llegada` al payload de telemetría de vuelos.

## Impact

- **Backend:** `TelemetriaService.java` — +2 campos en JSON de vuelos
- **Frontend:** `types.ts` — +2 campos en `VueloTelemetria`; `PanelVuelos.tsx` — nuevo dropdown + lógica de ordenamiento
- **API:** No hay cambios en API REST, solo en el payload del WebSocket de telemetría
