## Why

La vista de simulación en vivo no muestra los equipajes que han sido entregados recientemente. El backend ya expone el endpoint `GET /api/sesiones/{id}/envios/entregados-recientes?horas=4`, pero el frontend no lo consume. Esto impide al analista visualizar el progreso de entregas en tiempo real durante la simulación.

## What Changes

- Crear type `EnvioEntregadoResponse` en `types.ts`
- Agregar función `fetchEntregadosRecientes()` en `api.ts`
- Crear componente `PanelEntregados` que muestre los equipajes entregados en las últimas 4h virtuales, con polling automático mientras la sesión esté `EN_CURSO`
- Integrar `PanelEntregados` en la página `simulacion/[id]/page.tsx` dentro del panel lateral derecho

## Capabilities

### New Capabilities
- `panel-entregados-recientes`: Componente visual que lista equipajes con estado `ENTREGADO` filtrados por ventana de tiempo virtual, consumiendo el endpoint B4 del backend.

### Modified Capabilities
<!-- No existing specs change -->

## Impact

- **Frontend:** 1 nuevo type, 1 nueva función API, 1 nuevo componente, modificación menor en page.tsx
- **Backend:** Sin cambios (endpoint B4 ya existe)
- **Dependencias:** Ninguna nueva
