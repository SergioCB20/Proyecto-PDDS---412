## ADDED Requirements

### Requirement: Nodos muestran color según ocupación del almacén
Los `CircleMarker` de nodos en el mapa SHALL usar el color enviado por telemetría (verde < 70%, ámbar 70-90%, rojo > 90%) y actualizarse en vivo.

#### Scenario: Nodo con ocupación baja muestra color verde
- **WHEN** un nodo tiene `ocupacion_pct < 70%`
- **THEN** el `CircleMarker` SHALL mostrar color verde (`#22c55e`)
- **THEN** el `Tooltip` SHALL mostrar la ocupación actual con indicador verde

#### Scenario: Nodo con ocupación media muestra color ámbar
- **WHEN** un nodo tiene `ocupacion_pct` entre 70% y 90%
- **THEN** el `CircleMarker` SHALL mostrar color ámbar (`#eab308`)

#### Scenario: Nodo con ocupación alta muestra color rojo
- **WHEN** un nodo tiene `ocupacion_pct > 90%`
- **THEN** el `CircleMarker` SHALL mostrar color rojo (`#ef4444`)

### Requirement: Vuelos muestran Popup con capacidad al hacer clic
Cada vuelo en el mapa SHALL tener un `Popup` de Leaflet que muestre código de vuelo, ocupación %, capacidad total, y color de fondo verde/ámbar/rojo según ocupación.

#### Scenario: Popup de vuelo con capacidad verde
- **WHEN** el usuario hace clic en un marker de vuelo con `ocupacion_pct < 70%`
- **THEN** SHALL mostrar un Popup con el código del vuelo
- **THEN** SHALL mostrar "Ocupación: X/Y (Z%)" con color de fondo verde

#### Scenario: Popup de vuelo con capacidad roja
- **WHEN** el usuario hace clic en un marker de vuelo con `ocupacion_pct >= 90%`
- **THEN** SHALL mostrar un Popup con el código del vuelo y color de fondo rojo

#### Scenario: Popup visible en rutas de vuelo EN_RUTA
- **WHEN** un vuelo está en estado `EN_RUTA` y tiene coordenadas de ruta
- **THEN** el `Polyline` de la ruta SHALL tener un `Tooltip` con código, origen→destino y ocupación
- **THEN** al hacer clic en el marker del avión SHALL mostrar un `Popup` con información detallada de capacidad
