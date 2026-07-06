## Why

Al hacer clic en un marcador de vuelo en el mapa, no hay ninguna reacción en el panel lateral de Vuelos. El usuario debe buscar manualmente el vuelo en la lista del panel para ver sus detalles, rompiendo la sincronización esperada entre mapa y panel (mismo problema que se resolvió para aeropuertos).

## What Changes

- Agregar callback `onVueloSeleccionado` desde `AvionAnimado` hacia arriba, que propaga el `id` del vuelo clickeado
- En los views (`OperacionView`, `SimulacionView`, `ColapsoView`), manejar ese evento para seleccionar el vuelo en el panel
- En `PanelTabs`, al recibir un `vueloSeleccionadoId`, cambiar automáticamente a la pestaña "Vuelos"
- En `PanelVuelosOperacion`, hacer scroll y highlight visual del vuelo seleccionado
- Aplica para vuelos PROGRAMADO y EN_RUTA (los que tienen marcador `AvionAnimado` clickeable)

## Capabilities

### New Capabilities
- `sync-map-panel-vuelo`: Sincronización entre el marcador de vuelo en el mapa y su representación en la lista del panel lateral. Al hacer clic en un vuelo en el mapa, el panel cambia a la pestaña Vuelos, hace scroll al item correspondiente y lo resalta visualmente.

### Modified Capabilities

None.

## Impact

- **Frontend**: 6 archivos modificados (`AvionAnimado.tsx`, `GeoMapaVuelo.tsx`, `GeoMapa.tsx`, `PanelVuelosOperacion.tsx`, `PanelTabs.tsx`, `page.tsx`)
- Solo cambio del lado cliente, sin impacto en backend, API, base de datos o dependencias
