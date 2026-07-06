## Why

Al hacer clic en un marcador de aeropuerto en el mapa, no hay ninguna reacción en el panel lateral. El usuario debe buscar manualmente el aeropuerto en la lista del panel para ver sus detalles. Esto rompe la sincronización esperada entre mapa y panel, obligando a interacciones redundantes.

## What Changes

- Agregar callback `onAeropuertoClick` desde `GeoMapaAeropuerto` hacia arriba, que propague el `codigo_iata` del aeropuerto clickeado
- En los views (`OperacionView`, `SimulacionView`, `ColapsoView`), manejar ese evento para:
  - Hacer fly-to del mapa hacia el aeropuerto (ya existente vía `setSeguidoAeropuertoId`)
  - Seleccionar el aeropuerto en el panel (nuevo)
- En `PanelTabs`, al recibir un `aeropuertoSeleccionadoId`, cambiar automáticamente a la pestaña "Aeropuertos" (si no lo está)
- En `PanelAeropuertosOperacion`, hacer scroll y highlight visual del aeropuerto seleccionado

## Capabilities

### New Capabilities
- `sync-map-panel-airport`: Sincronización bidireccional entre el marcador de aeropuerto en el mapa y su representación en la lista del panel lateral. Al hacer clic en un aeropuerto en el mapa, el panel cambia a la pestaña Aeropuertos, hace scroll al item correspondiente y lo resalta visualmente.

### Modified Capabilities

None. No cambian requisitos a nivel de spec existentes.

## Impact

- **Frontend**: 5 archivos modificados (`GeoMapaAeropuerto.tsx`, `GeoMapa.tsx`, `PanelAeropuertosOperacion.tsx`, `PanelTabs.tsx`, `page.tsx`)
- Solo cambio del lado cliente, sin impacto en backend, API, base de datos o dependencias
