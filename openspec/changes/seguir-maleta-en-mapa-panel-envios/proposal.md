## Why

Actualmente el panel de envíos (tanto en operación como en simulación) solo permite descargar el plan de viaje PDF de cada maleta. El operador/analista no puede localizar visualmente en el mapa el vuelo que transporta una maleta específica, lo que obliga a cambiar manualmente entre la lista y el mapa. Se necesita un botón por envío que, al pulsarlo, lleve el mapa directamente al vuelo que transporta esa maleta.

## What Changes

- Se agrega un botón "Seguir en mapa" (icono de pin/mapa) por cada fila de envío en los paneles `PanelEnviosOperacion` (operación) y `PanelEnvios` (simulación/colapso).
- Al pulsar el botón, el frontend consulta `GET /api/equipajes/{id}/plan-viaje` para obtener la ubicación actual de la maleta (`ubicacion_actual.tipo` y `referencia_id`).
- Si la maleta está en un vuelo (`tipo === "VUELO"`), se activa el seguimiento de ese vuelo en el mapa (brillo dorado, cámara centrada, igual que el botón "Ver en mapa" existente en vuelos).
- Si la maleta no está en un vuelo actualmente (ej. esperando en aeropuerto), se muestra un mensaje informativo.
- No hay cambios de backend: el endpoint `GET /api/equipajes/{id}/plan-viaje` ya existe y retorna la información necesaria.

## Capabilities

### New Capabilities
- `seguir-maleta-mapa`: Botón por fila de envío que consulta el plan de viaje JSON y activa el seguimiento del vuelo correspondiente en el mapa Leaflet.

### Modified Capabilities
- *(ninguna — no se modifican requisitos de capacidades existentes)*

## Impact

- **Frontend**: Modificaciones en `PanelEnviosOperacion.tsx`, `PanelEnvios.tsx`, `api.ts`, y cableado en `page.tsx` (tres vistas: OperacionView, SimulacionView, ColapsoView).
- **Backend**: Sin cambios.
- **API**: Se consume el endpoint existente `GET /equipajes/{id}/plan-viaje` (JSON). No hay endpoints nuevos.
- **Dependencias**: `lucide-react` (icono `MapPin`) — ya disponible en el proyecto.
