## Why

Los paneles de vuelos y nodos en la vista de simulación (`/simulacion/[id]`) muestran datos agregados (ocupación, capacidad, estado), pero no permiten inspeccionar los envíos (equipajes) concretos asociados a cada vuelo o nodo. Esto limita el monitoreo operativo durante la simulación. T13 agrega esta capacidad para que el analista pueda hacer clic en un vuelo o nodo y ver los equipajes actuales.

## What Changes

- Nuevo componente `PanelEnvios` que se renderiza en el sidebar de simulación al hacer clic en un vuelo o nodo.
- `PanelVuelos` y `PanelNodos` agregan props `onVueloClick` / `onNodoClick` para propagar el evento al padre.
- `page.tsx` agrega estado `selectedEnvio` y renderiza `PanelEnvios` condicionalmente.
- El componente consume los endpoints backend B2 (`GET /api/sesiones/{id}/envios/vuelo/{vueloId}`) y B3 (`GET /api/sesiones/{id}/envios/nodo/{nodoIata}`) que ya están implementados.

## Capabilities

### New Capabilities
- `panel-envios`: Subpanel inline en el sidebar de simulación que lista los equipajes asignados a un vuelo o almacenados en un nodo, con origen, destino, código de equipaje y cantidad de maletas.

### Modified Capabilities
- *(ninguna)*

## Impact

- **Frontend**: Nuevo componente `PanelEnvios.tsx`. Modificaciones en `PanelVuelos.tsx`, `PanelNodos.tsx` y `page.tsx`.
- **Backend**: Sin cambios (B2 y B3 ya están implementados).
- **Tipos**: Agregar `EnvioItemResponse` a `types.ts`.
