## 1. Capa Mapa — Propagar evento click desde GeoMapaAeropuerto

- [x] 1.1 Agregar prop `onClick?: (codigoIata: string) => void` a `GeoMapaAeropuertoProps`
- [x] 1.2 Agregar `eventHandlers={{ click: () => onClick?.(aeropuerto.codigo_iata) }}` en el `Marker` de `GeoMapaAeropuerto`
- [x] 1.3 Agregar prop `onAeropuertoClick?: (codigoIata: string) => void` a `GeoMapaProps`
- [x] 1.4 Pasar `onAeropuertoClick` desde `GeoMapa` a cada `GeoMapaAeropuerto`

## 2. Panel — Scroll y highlight en PanelAeropuertosOperacion

- [x] 2.1 Agregar prop `seleccionadoId?: string` a `PanelAeropuertosOperacionProps`
- [x] 2.2 Crear `itemRefs` con `useRef<Record<string, HTMLDivElement | null>>({})`
- [x] 2.3 Asignar `ref={el => { itemRefs.current[n.codigo_iata] = el }}` en cada item de la lista
- [x] 2.4 Agregar `useEffect` que al cambiar `seleccionadoId` haga `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- [x] 2.5 Agregar highlight visual (borde azul + anillo) cuando `seleccionadoId === n.codigo_iata`

## 3. PanelTabs — Auto-switch a pestaña Aeropuertos

- [x] 3.1 Agregar prop `aeropuertoSeleccionadoId?: string` a `PanelTabsProps`
- [x] 3.2 En `PanelTabs`, cuando `aeropuertoSeleccionadoId` cambia, forzar tab a 'aeropuertos'
- [x] 3.3 Pasar `aeropuertoSeleccionadoId` como `seleccionadoId` a `PanelAeropuertosOperacion`

## 4. Views — Conectar mapa con panel en OperacionView, SimulacionView, ColapsoView

- [x] 4.1 En `OperacionView`: agregar estado `aeroSeleccionado`, pasarlo como `onAeropuertoClick` a `GeoMapa` y como `aeropuertoSeleccionadoId` a `PanelTabs`
- [x] 4.2 En `SimulacionView`: misma lógica que 4.1
- [x] 4.3 En `ColapsoView`: misma lógica que 4.1
