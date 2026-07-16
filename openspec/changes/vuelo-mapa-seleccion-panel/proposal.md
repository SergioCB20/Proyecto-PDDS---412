## Why

Al hacer clic en un vuelo en el mapa, el panel de vuelos debe mostrar la información detallada del vuelo seleccionado (modal con detalle de envíos), del mismo modo que al hacer clic en una fila de la tabla de vuelos. Actualmente el clic en el mapa solo enfoca la cámara en el vuelo y lo resalta, pero no abre el modal de detalle.

## What Changes

- Modificar la cadena de callbacks `onVueloSeleccionado` en los componentes del mapa (`AvionAnimado`, `GeoMapaVuelo`, `GeoMapa`) para que transmitan también el `codigo_vuelo`
- Modificar los handlers `handleVueloSeleccionado*` en `page.tsx` (OperacionView, SimulacionView, ColapsoView) para que además de setear el estado de selección, abran el modal `ModalEnvios` con `{ tipo: "vuelo", id, codigo }`

## Capabilities

### New Capabilities
- `vuelo-mapa-seleccion-detalle`: Al hacer clic en un avión en el mapa se selecciona el vuelo en el panel y se abre el modal con la información detallada del vuelo y sus envíos

### Modified Capabilities

_(ninguna)_

## Impact

- `frontend/components/mapa/AvionAnimado.tsx` — firma de `onVueloSeleccionado` cambia de `(id: string)` a `(id: string, codigo: string)`
- `frontend/components/mapa/GeoMapaVuelo.tsx` — firma de prop actualizada
- `frontend/components/mapa/GeoMapa.tsx` — firma de prop actualizada
- `frontend/app/page.tsx` — los 3 handlers de vuelo (`*Op`, `*Sim`, `*Col`) reciben `codigo` y llaman `setSelectedEnvio`
