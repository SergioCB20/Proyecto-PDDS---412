## 1. Capa Mapa — Propagar evento click desde AvionAnimado

- [x] 1.1 Agregar prop `onVueloSeleccionado?: (id: string) => void` a `AvionAnimadoProps`
- [x] 1.2 Modificar `eventHandlers.click` en `AvionAnimado` para llamar también `onVueloSeleccionado`
- [x] 1.3 Agregar prop `onVueloSeleccionado?: (id: string) => void` a `GeoMapaVueloProps` y pasarlo a `AvionAnimado`
- [x] 1.4 Agregar prop `onVueloSeleccionado?: (id: string) => void` a `GeoMapaProps` y pasarlo a cada `GeoMapaVuelo`

## 2. Panel — Scroll y highlight en PanelVuelosOperacion

- [x] 2.1 Agregar prop `seleccionadoId?: string` a `PanelVuelosOperacionProps`
- [x] 2.2 Importar `useRef` y `useEffect`
- [x] 2.3 Crear `itemRefs` con `useRef<Record<string, HTMLDivElement | null>>({})`
- [x] 2.4 Asignar `ref` en cada item de la lista de vuelos
- [x] 2.5 Agregar `useEffect` que al cambiar `seleccionadoId` haga `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- [x] 2.6 Agregar highlight visual (borde azul + ring-2) cuando `seleccionadoId === v.id`

## 3. PanelTabs — Auto-switch a pestaña Vuelos

- [x] 3.1 Agregar prop `vueloSeleccionadoId?: string` a `PanelTabsProps`
- [x] 3.2 Agregar `useEffect` que cuando `vueloSeleccionadoId` cambia, forzar tab a 'vuelos'
- [x] 3.3 Pasar `vueloSeleccionadoId` como `seleccionadoId` a `PanelVuelosOperacion`

## 4. Views — Conectar mapa con panel en OperacionView, SimulacionView, ColapsoView

- [x] 4.1 En `OperacionView`: agregar estado `vueloSeleccionado`, handler `handleVueloSeleccionado`, pasarlo a `GeoMapa.onVueloSeleccionado` y a `PanelTabs.vueloSeleccionadoId`
- [x] 4.2 En `SimulacionView`: misma lógica que 4.1
- [x] 4.3 En `ColapsoView`: misma lógica que 4.1
