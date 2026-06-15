## Why

El `PanelVuelos` ya permite filtrar vuelos por origen y destino en la lista lateral, pero esos filtros no afectan al `GeoMapa`. El analista no puede visualizar en el mapa únicamente los vuelos que le interesan, lo que fuerza a inspeccionar todos los vuelos simultáneamente en rutas aéreas densas.

## What Changes

- Modificar `PanelVuelos` para exponer el estado de filtros de origen/destino al padre mediante callback `onFilterChange`
- Agregar estado de filtros en `SimulacionContent` (página `simulacion/[id]/page.tsx`)
- Computar `vuelosMapaFiltrados` con `useMemo` aplicando los filtros antes de pasar los datos a `GeoMapa`
- `GeoMapa` no requiere cambios — solo recibe la lista ya filtrada

## Capabilities

### New Capabilities
- `filtro-mapa-vuelos`: Sincronización de filtros de origen/destino entre el panel lateral de vuelos y el mapa, permitiendo que el mapa muestre solo los vuelos que coinciden con los filtros activos.

### Modified Capabilities
<!-- No existing spec changes required -->

## Impact

- **Frontend:** 2 archivos modificados (`PanelVuelos.tsx`, `page.tsx`), 0 archivos nuevos
- **Backend:** Sin cambios
- **Dependencias:** Ninguna
