# control-zoom-continuo

> **Spec owner:** Frontend Dev
> **Estado:** Draft v1
> **Última actualización:** 2026
> **Implementado por:** Frontend Dev

---

## ADDED Requirements

### Requirement: Control de zoom personalizado con slider continuo

El mapa interactivo (`GeoMapa`) SHALL reemplazar el control de zoom nativo de Leaflet por un control personalizado (`ControlZoom`) que permita zoom continuo mediante un slider y botones de incremento/decremento.

El `ControlZoom` SHALL estar posicionado en la esquina inferior izquierda del mapa, sin solaparse con la leyenda existente (`GeoMapaLeyenda`).

#### Scenario: Slider controla el zoom del mapa

- **WHEN** el usuario mueve el slider del `ControlZoom` a un nuevo valor
- **THEN** el mapa SHALL ajustar su nivel de zoom al valor seleccionado
- **THEN** el slider SHALL reflejar el zoom actual en todo momento

#### Scenario: Botón − reduce el zoom

- **WHEN** el usuario hace clic en el botón `−` del `ControlZoom`
- **THEN** el zoom del mapa SHALL disminuir en 0.5 (o hasta `minZoom` si está en el mínimo)
- **THEN** el slider SHALL actualizarse al nuevo valor

#### Scenario: Botón + aumenta el zoom

- **WHEN** el usuario hace clic en el botón `+` del `ControlZoom`
- **THEN** el zoom del mapa SHALL aumentar en 0.5 (o hasta `maxZoom` si está en el máximo)
- **THEN** el slider SHALL actualizarse al nuevo valor

#### Scenario: Scroll wheel también ajusta el slider

- **WHEN** el usuario usa la rueda del ratón para hacer zoom en el mapa
- **THEN** el slider del `ControlZoom` SHALL actualizarse para reflejar el nuevo nivel de zoom

---

### Requirement: Indicador de porcentaje de zoom

El `ControlZoom` SHALL mostrar el nivel de zoom actual como un porcentaje sobre el rango configurado (`minZoom`–`maxZoom`).

La fórmula del porcentaje SHALL ser: `((zoom - minZoom) / (maxZoom - minZoom)) * 100`

Ejemplo con `minZoom=2` y `maxZoom=14`:
- zoom 2 → 0%
- zoom 5 → 25%
- zoom 8 → 50%
- zoom 11 → 75%
- zoom 14 → 100%

#### Scenario: Visualización de porcentaje en valor mínimo

- **WHEN** el zoom del mapa está en `minZoom` (2)
- **THEN** el `ControlZoom` SHALL mostrar `0%`
- **THEN** el slider SHALL estar en su posición mínima

#### Scenario: Visualización de porcentaje en valor medio

- **WHEN** el zoom del mapa está en 8.0 (punto medio del rango 2–14)
- **THEN** el `ControlZoom` SHALL mostrar `50%`
- **THEN** el slider SHALL estar en la posición media

#### Scenario: Visualización de porcentaje en valor máximo

- **WHEN** el zoom del mapa está en `maxZoom` (14)
- **THEN** el `ControlZoom` SHALL mostrar `100%`
- **THEN** el slider SHALL estar en su posición máxima

---

### Requirement: Zoom continuo con pasos fraccionados

El `MapContainer` SHALL configurarse con `zoomSnap={0.5}` y `zoomDelta={0.5}` para permitir niveles de zoom fraccionados.

El rango de zoom SHALL estar acotado entre `minZoom={2}` y `maxZoom={14}`.

#### Scenario: Zoom con scroll wheel es suave

- **WHEN** el usuario usa la rueda del ratón para hacer zoom
- **THEN** el zoom SHALL cambiar en incrementos de 0.5 (no solo enteros)
- **THEN** el slider del `ControlZoom` SHALL reflejar el valor fraccionado

#### Scenario: Zoom no supera minZoom

- **WHEN** el zoom está en 2.0 y el usuario intenta alejar más
- **THEN** el zoom SHALL permanecer en 2.0
- **THEN** el slider SHALL mostrar 0%

#### Scenario: Zoom no supera maxZoom

- **WHEN** el zoom está en 14.0 y el usuario intenta acercar más
- **THEN** el zoom SHALL permanecer en 14.0
- **THEN** el slider SHALL mostrar 100%

---

### Requirement: Margen interno de 1cm en el mapa

El contenedor del `GeoMapa` SHALL tener un padding interno de 10px para evitar que los elementos del mapa (aeropuertos, rutas de vuelo) queden pegados al borde visual.

Este padding SHALL aplicarse mediante la propiedad `style={{ padding: '10px' }}` en el `div` wrapper del `GeoMapa`.

#### Scenario: Elementos del mapa no tocan el borde

- **WHEN** se renderiza el mapa con aeropuertos y vuelos
- **THEN** SHALL haber al menos 10px de espacio entre el borde del contenedor del mapa y el contenido del `MapContainer`

#### Scenario: Padding mantiene operatividad del mapa

- **WHEN** el mapa tiene padding de 10px
- **THEN** el `MapContainer` SHALL seguir ocupando todo el espacio interior disponible (ancho y alto completos dentro del padding)
- **THEN** los controles de zoom, clics y arrastre SHALL funcionar normalmente dentro del área del mapa