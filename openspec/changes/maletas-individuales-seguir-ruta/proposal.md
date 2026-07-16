## Why

Actualmente los botones "Seguir en mapa" y "Mostrar ruta" solo existen a nivel de equipaje (grupo de maletas). Para ver la ubicación o ruta de una maleta individual, el usuario debe localizar su equipaje padre y expandirlo, lo que requiere múltiples clics. No hay botones de acción directa en las maletas individuales.

## What Changes

- Agregar botones Seguir (MapPin) y Ruta (Route) a cada maleta individual en los tres componentes donde se listan maletas
- En `PanelEnviosMaletas`, agregar expansión por fila para mostrar maletas individuales con sus botones de acción
- No requiere cambios en backend ni API — se reutiliza `fetchPlanViaje(equipaje_id)` ya que las maletas tienen el UUID del equipaje padre

## Capabilities

### New Capabilities
- `maleta-seguir-ruta-botones`: Botones Seguir y Ruta por maleta individual en todos los paneles donde se listan maletas

### Modified Capabilities

*(Ninguno — solo se agrega UI nueva)*

## Impact

- **Frontend**: `ModalEnvios.tsx` — agregar botones en lista expandida de maletas y en lista plana "Todas las maletas del vuelo"
- **Frontend**: `DetalleEnviosAeropuerto.tsx` — agregar botones en lista expandida de maletas
- **Frontend**: `PanelEnviosMaletas.tsx` — agregar expansión por fila + botones por maleta
- **Backend**: Sin cambios
- **API**: Sin cambios — usa `GET /api/equipajes/{id}/plan-viaje` existente
