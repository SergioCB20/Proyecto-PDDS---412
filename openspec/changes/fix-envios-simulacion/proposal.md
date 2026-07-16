## Why

En modo simulación, los paneles de "Envíos de Maletas", detalle de aeropuerto (envíos saliendo/llegando) y modal de vuelo no cargan datos de equipajes porque las queries del backend no filtran por `sesion_id` o filtran en memoria, y el frontend no propaga `sesionId` a los componentes de panel.

## What Changes

- Agregar 4 nuevas queries en `EquipajeRepository.java` con filtro `WHERE pv.sesionId = :sesionId` para el panel de envíos y el detalle de aeropuerto
- Modificar `SesionService.obtenerEnviosPanelSesion()` para usar la nueva query en vez del filtro en memoria
- Modificar `EquipajeService.obtenerEnviosPorNodoConClasificacion()` para aceptar `sesionId` opcional
- Agregar `@RequestParam(required=false) UUID sesionId` a `GET /api/nodos/{iata}/envios`
- Propagar `sesionId` desde `page.tsx` → `PanelTabs` → `PanelAeropuertosOperacion` → `DetalleEnviosAeropuerto`
- Modificar `fetchEnviosNodoConClasificacion` en `api.ts` para enviar `sesionId` como query param

## Capabilities

### New Capabilities
- `envios-simulacion-sesion`: En modo simulación, todos los paneles de envíos filtran correctamente por la sesión activa

### Modified Capabilities
- `envios-panel`: El backend agrega filtro por `sesion_id` en las queries del panel de envíos
- `nodo-envios-clasificacion`: El endpoint acepta `sesionId` opcional para filtrar por sesión

## Impact

- `backend/.../bc1/infrastructure/EquipajeRepository.java` — 4 nuevas queries
- `backend/.../bc2/application/SesionService.java` — usar nueva query, eliminar filtro in-memory
- `backend/.../bc1/application/EquipajeService.java` — método modificado para aceptar sesionId
- `backend/.../bc1/infrastructure/NodoController.java` — nuevo query param opcional
- `frontend/lib/api.ts` — fetch con sesionId
- `frontend/components/operacion/DetalleEnviosAeropuerto.tsx` — nueva prop
- `frontend/components/operacion/PanelAeropuertosOperacion.tsx` — nueva prop
- `frontend/components/shared/PanelTabs.tsx` — propagar sesionId
- `frontend/app/page.tsx` — pasar sesionId en SimulacionView
