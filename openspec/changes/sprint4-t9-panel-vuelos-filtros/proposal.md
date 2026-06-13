## Why

La vista de simulación en vivo (`/simulacion/[id]`) actualmente muestra un listado plano de vuelos sin posibilidad de filtrar ni buscar. Cuando hay muchos vuelos simultáneos (10+), el operador no puede encontrar rápidamente un vuelo específico por código, origen o destino, lo que dificulta el monitoreo operativo.

## What Changes

- Crear nuevo componente `PanelVuelos` con filtros de búsqueda por código, origen y destino
- Reemplazar la sección "Ocupación de Vuelos" actual por el nuevo panel
- Mantener el `ResumenVuelos` existente (agregación por nodo) sin modificaciones
- Los filtros funcionan sobre datos de telemetría WebSocket en vivo

## Capabilities

### New Capabilities
- `panel-vuelos-filtros`: Panel de listado de vuelos con filtros en vivo por código, origen IATA y destino IATA, integrado en la vista de simulación

### Modified Capabilities
- Ninguna. No se modifican requisitos a nivel spec de capacidades existentes.

## Impact

- **Archivo nuevo:** `frontend/components/simulacion/PanelVuelos.tsx`
- **Archivo modificado:** `frontend/app/simulacion/[id]/page.tsx` (importar PanelVuelos, reemplazar sección "Ocupación de Vuelos")
- **Sin impacto en backend:** todo es frontend, los datos vienen de la telemetría WebSocket existente
- **Sin impacto en otros componentes:** `ResumenVuelos`, `GeoMapa`, `MetricaCard` no se modifican
