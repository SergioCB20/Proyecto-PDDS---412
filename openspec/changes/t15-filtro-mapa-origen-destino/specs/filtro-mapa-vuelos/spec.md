## ADDED Requirements

### Requirement: Sincronizar filtros origen/destino con el mapa
El sistema SHALL sincronizar los filtros de origen y destino seleccionados en `PanelVuelos` con el `GeoMapa`, de modo que el mapa solo muestre los vuelos que coinciden con ambos filtros activos.

#### Scenario: Filtrar por origen en el mapa
- **WHEN** el analista selecciona un aeropuerto de origen en el filtro de `PanelVuelos`
- **THEN** el `GeoMapa` oculta todos los vuelos cuyo `origen_iata` no coincide
- **THEN** los vuelos no coincidentes no se renderizan en el mapa

#### Scenario: Filtrar por destino en el mapa
- **WHEN** el analista selecciona un aeropuerto de destino en el filtro de `PanelVuelos`
- **THEN** el `GeoMapa` oculta todos los vuelos cuyo `destino_iata` no coincide

#### Scenario: Combinar filtros de origen y destino
- **WHEN** ambos filtros están activos simultáneamente
- **THEN** el mapa solo muestra vuelos cuyo `origen_iata` Y `destino_iata` coinciden con los filtros

#### Scenario: Limpiar filtros restaura mapa completo
- **WHEN** el analista limpia ambos filtros (selecciona valores vacíos)
- **THEN** el `GeoMapa` muestra todos los vuelos nuevamente

### Requirement: Estado de filtros persistente al cambiar datos
El sistema SHALL mantener los filtros activos cuando lleguen nuevos datos por WebSocket o polling.

#### Scenario: Filtro se mantiene con nueva telemetría
- **WHEN** el WebSocket entrega nuevos datos de vuelos
- **THEN** los filtros de origen/destino permanecen con los valores seleccionados
- **THEN** el mapa aplica los filtros a los nuevos datos automáticamente
