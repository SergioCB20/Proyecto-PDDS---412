## 1. Modificar PanelVuelos

- [ ] 1.1 Agregar props `origenFilter`, `destinoFilter`, `onFilterChange` a `PanelVuelos`
- [ ] 1.2 Reemplazar estado local `filtroOrigen`/`filtroDestino` por props controladas
- [ ] 1.3 Llamar `onFilterChange` al cambiar los selects de origen/destino

## 2. Modificar SimulacionContent

- [ ] 2.1 Agregar estado `vueloFilterOrigen` y `vueloFilterDestino` en `page.tsx`
- [ ] 2.2 Computar `vuelosMapaFiltrados` con `useMemo` aplicando filtros
- [ ] 2.3 Pasar filtros+callback a `PanelVuelos`
- [ ] 2.4 Pasar `vuelosMapaFiltrados` a `GeoMapa`

## 3. Verificación

- [ ] 3.1 Compilar frontend con `npx tsc --noEmit`
