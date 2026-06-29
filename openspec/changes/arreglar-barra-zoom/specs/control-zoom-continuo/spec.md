# control-zoom-continuo

> **Spec owner:** Frontend Dev
> **Estado:** Delta v2
> **Última actualización:** 2026
> **Implementado por:** Frontend Dev

---

## MODIFIED Requirements

### Requirement: Control de zoom personalizado con slider continuo

El mapa interactivo (`GeoMapa`) SHALL reemplazar el control de zoom nativo de Leaflet por un control personalizado (`ControlZoom`) que permita zoom continuo mediante un slider y botones de incremento/decremento.

El `ControlZoom` SHALL estar posicionado en la esquina inferior izquierda del mapa, sin solaparse con la leyenda existente (`GeoMapaLeyenda`).

El slider SHALL usar un rango de `0` a `200` con paso `1`.

El valor del slider SHALL convertirse internamente al nivel de zoom de Leaflet mediante la fórmula: `leafletZoom = MIN_ZOOM + (sliderValue / SLIDER_MAX) * (MAX_ZOOM - MIN_ZOOM)`, donde `MIN_ZOOM=2` y `MAX_ZOOM=14`.

#### Scenario: Slider controla el zoom del mapa

- **WHEN** el usuario mueve el slider del `ControlZoom` a un nuevo valor
- **THEN** el mapa SHALL ajustar su nivel de zoom al valor convertido
- **THEN** el slider SHALL reflejar el valor convertido del zoom actual en todo momento

#### Scenario: Botón − reduce el zoom

- **WHEN** el usuario hace clic en el botón `−` del `ControlZoom`
- **THEN** el valor del slider SHALL disminuir en 1 (o hasta 0 si está en el mínimo)
- **THEN** el mapa SHALL ajustar su zoom al valor convertido
- **THEN** el slider SHALL actualizarse al nuevo valor

#### Scenario: Botón + aumenta el zoom

- **WHEN** el usuario hace clic en el botón `+` del `ControlZoom`
- **THEN** el valor del slider SHALL aumentar en 1 (o hasta 200 si está en el máximo)
- **THEN** el mapa SHALL ajustar su zoom al valor convertido
- **THEN** el slider SHALL actualizarse al nuevo valor

#### Scenario: Scroll wheel también ajusta el slider

- **WHEN** el usuario usa la rueda del ratón para hacer zoom en el mapa
- **THEN** el slider del `ControlZoom` SHALL actualizarse para reflejar el nuevo nivel de zoom convertido a la escala 0–200

### Requirement: Indicador de nivel de zoom

El `ControlZoom` SHALL mostrar el nivel de zoom actual como un valor numérico en la escala `0–200`.

La fórmula SHALL ser: `sliderValue = ((leafletZoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * SLIDER_MAX`

Ejemplo con `MIN_ZOOM=2`, `MAX_ZOOM=14`, `SLIDER_MAX=200`:
- zoom Leaflet 2 → 0
- zoom Leaflet 5 → 50
- zoom Leaflet 8 → 100
- zoom Leaflet 11 → 150
- zoom Leaflet 14 → 200

#### Scenario: Visualización en valor mínimo

- **WHEN** el zoom del mapa está en `minZoom` (2)
- **THEN** el `ControlZoom` SHALL mostrar `0`
- **THEN** el slider SHALL estar en su posición mínima

#### Scenario: Visualización en valor medio

- **WHEN** el zoom del mapa está en 8.0 (punto medio del rango 2–14)
- **THEN** el `ControlZoom` SHALL mostrar `100`
- **THEN** el slider SHALL estar en la posición media

#### Scenario: Visualización en valor máximo

- **WHEN** el zoom del mapa está en `maxZoom` (14)
- **THEN** el `ControlZoom` SHALL mostrar `200`
- **THEN** el slider SHALL estar en su posición máxima

### Requirement: Zoom continuo con pasos fraccionados

El `MapContainer` SHALL configurarse con `zoomSnap={0}` y `zoomDelta={0.5}` para permitir niveles de zoom fraccionados.

El rango de zoom SHALL estar acotado entre `minZoom={2}` y `maxZoom={14}`.

#### Scenario: Zoom con scroll wheel es suave

- **WHEN** el usuario usa la rueda del ratón para hacer zoom
- **THEN** el zoom SHALL cambiar en incrementos de 0.5 (no solo enteros)
- **THEN** el slider del `ControlZoom` SHALL reflejar el valor convertido a la escala 0–200

#### Scenario: Zoom no supera minZoom

- **WHEN** el zoom está en 2.0 y el usuario intenta alejar más
- **THEN** el zoom SHALL permanecer en 2.0
- **THEN** el slider SHALL mostrar 0

#### Scenario: Zoom no supera maxZoom

- **WHEN** el zoom está en 14.0 y el usuario intenta acercar más
- **THEN** el zoom SHALL permanecer en 14.0
- **THEN** el slider SHALL mostrar 200
