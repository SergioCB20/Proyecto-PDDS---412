## Context

Actualmente `PanelVuelos` mantiene `filtroOrigen` y `filtroDestino` como estado local (`useState`). La lista filtrada solo se usa internamente para renderizar los items. `GeoMapa` recibe `vuelosMapa` sin filtrar desde `SimulacionContent`. No hay comunicación entre el panel y el mapa respecto a filtros.

## Goals / Non-Goals

**Goals:**
- Sincronizar filtros de origen/destino entre PanelVuelos y GeoMapa
- Mantener `filtroCodigo` como estado local de PanelVuelos (no afecta al mapa)
- Mínimo impacto: solo modificar props y estado, sin reestructurar componentes

**Non-Goals:**
- No sincronizar `filtroCodigo` con el mapa (solo origen/destino aplican)
- No agregar filtros nuevos
- No modificar GeoMapa

## Decisions

1. **Lifting state up**: Se mueven `filtroOrigen` y `filtroDestino` de `PanelVuelos` a `SimulacionContent`. PanelVuelos los recibe como props controladas y notifica cambios via `onFilterChange`. Esto es el patrón estándar React para compartir estado entre componentes hermanos.

2. **filtroCodigo se queda local**: El filtro por código es solo para la lista del panel, no tiene sentido geográfico en el mapa.

3. **useMemo para vuelos filtrados**: Se computa `vuelosMapaFiltrados` con `useMemo` en `SimulacionContent` para evitar recomputaciones innecesarias al renderizar GeoMapa.

## Risks / Trade-offs

- El filtro de origen/destino en el mapa oculta vuelos no coincidentes, lo que podría desorientar si el analista no recuerda que el filtro está activo. → Mitigación: el resumen de vuelos (cantidad total vs filtrados) se mantiene visible.
