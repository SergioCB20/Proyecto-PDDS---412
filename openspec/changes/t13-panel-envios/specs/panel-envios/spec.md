## ADDED Requirements

### Requirement: Mostrar envíos al hacer clic en un vuelo en el panel de vuelos

Cuando el analista hace clic en un vuelo dentro del `PanelVuelos`, el sistema SHALL mostrar un subpanel `PanelEnvios` con los equipajes actualmente asignados a ese vuelo dentro de la sesión. El subpanel SHALL consumir el endpoint `GET /api/sesiones/{id}/envios/vuelo/{vueloId}`.

#### Scenario: Clic en vuelo con envíos
- **WHEN** el analista hace clic en un vuelo que tiene equipajes asignados
- **THEN** se muestra un subpanel con el título "Envíos del vuelo {código_vuelo}" y una lista donde cada fila contiene: origen_iata, destino_iata, codigo_equipaje, cantidad

#### Scenario: Clic en vuelo sin envíos
- **WHEN** el analista hace clic en un vuelo sin equipajes asignados
- **THEN** se muestra "Sin envíos" y el título "Envíos del vuelo {código_vuelo}"

### Requirement: Mostrar envíos al hacer clic en un nodo en el panel de nodos

Cuando el analista hace clic en un nodo dentro del `PanelNodos`, el sistema SHALL mostrar un subpanel `PanelEnvios` con los equipajes actualmente almacenados (estado `EN_ALMACEN`) en ese nodo dentro de la sesión. El subpanel SHALL consumir el endpoint `GET /api/sesiones/{id}/envios/nodo/{nodoIata}`.

#### Scenario: Clic en nodo con envíos
- **WHEN** el analista hace clic en un nodo que tiene equipajes almacenados
- **THEN** se muestra un subpanel con el título "Envíos en nodo {codigo_iata}" y una lista donde cada fila contiene: origen_iata, destino_iata, codigo_equipaje, cantidad

#### Scenario: Clic en nodo sin envíos
- **WHEN** el analista hace clic en un nodo sin equipajes almacenados
- **THEN** se muestra "Sin envíos" y el título "Envíos en nodo {codigo_iata}"

### Requirement: Cerrar subpanel de envíos

El subpanel `PanelEnvios` SHALL incluir un botón "Cerrar" que oculta el subpanel y restaura la vista normal de los paneles de vuelos y nodos.

#### Scenario: Cerrar subpanel
- **WHEN** el analista hace clic en "Cerrar" dentro del subpanel de envíos
- **THEN** el subpanel se oculta y los paneles de vuelos y nodos vuelven a su estado normal

### Requirement: Estados de carga y error del subpanel

El subpanel `PanelEnvios` SHALL mostrar estados de carga mientras se espera la respuesta del backend, y estados de error si la petición falla.

#### Scenario: Carga en progreso
- **WHEN** el analista hace clic en un vuelo o nodo y la petición está en curso
- **THEN** el subpanel muestra un mensaje "Cargando envíos..."

#### Scenario: Error en la petición
- **WHEN** la petición al endpoint falla
- **THEN** el subpanel muestra un mensaje de error con la opción de reintentar
