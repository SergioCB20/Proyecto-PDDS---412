## ADDED Requirements

### Requirement: Tipos TypeScript renombrados
Los tipos e interfaces TypeScript que contiene "Nodo" en su nombre DEBEN ser renombrados a "Aeropuerto" sin cambiar las propiedades internas que mapean a JSON keys del backend.

#### Scenario: Tipo Nodo renombrado
- **WHEN** se importa el tipo de un aeropuerto desde `types.ts`
- **THEN** el tipo se llama `Aeropuerto` en vez de `Nodo`
- **AND** sus propiedades (`codigo_iata`, `capacidad_almacen`, `ocupacion_actual`, `nodo_ref_id`, etc.) conservan sus nombres originales

#### Scenario: Tipo NodoEnMapa renombrado
- **WHEN** se usa el tipo para el mapa
- **THEN** el tipo se llama `AeropuertoEnMapa` en vez de `NodoEnMapa`
- **AND** extiende de `Aeropuerto` en vez de `Nodo`

#### Scenario: Tipo NodoTelemetria renombrado
- **WHEN** se usa el tipo para datos de WebSocket
- **THEN** el tipo se llama `AeropuertoTelemetria` en vez de `NodoTelemetria`
- **AND** la propiedad del mensaje de telemetría sigue llamándose internamente `nodos` en el contrato JSON

### Requirement: Constantes y funciones renombradas
Las constantes y funciones helper que contienen "Nodo" en su nombre DEBEN ser renombradas.

#### Scenario: Constante de colores renombrada
- **WHEN** se usa la constante de colores para aeropuertos
- **THEN** la constante se llama `COLOR_AEROPUERTO` en vez de `COLOR_NODO`

#### Scenario: Función de color por ocupación renombrada
- **WHEN** se calcula el color según ocupación
- **THEN** la función se llama `colorAeropuertoPorOcupacion` en vez de `colorNodoPorOcupacion`

#### Scenario: Función de transformación renombrada
- **WHEN** se transforman datos de API a formato de mapa
- **THEN** la función se llama `aeropuertoToEnMapa` en vez de `nodoToEnMapa`

#### Scenario: Array mock renombrado
- **WHEN** se usan datos mock
- **THEN** el array se llama `MOCK_AEROPUERTOS` en vez de `MOCK_NODOS`

### Requirement: Funciones de API renombradas
Las funciones del cliente API que contienen "Nodo" en su nombre DEBEN ser renombradas.

#### Scenario: Función de envíos por aeropuerto (simulación) renombrada
- **WHEN** se buscan envíos por aeropuerto en simulación
- **THEN** la función se llama `fetchEnviosAeropuerto` en vez de `fetchEnviosNodo`
- **AND** la URL de API sigue siendo `/sesiones/{id}/envios/nodo/{nodoIata}`

#### Scenario: Función de envíos por aeropuerto (operación) renombrada
- **WHEN** se buscan envíos por aeropuerto en operación
- **THEN** la función se llama `fetchEnviosAeropuertoOperacion` en vez de `fetchEnviosNodoOperacion`
- **AND** la URL de API sigue siendo `/nodos/{nodoIata}/equipajes`

### Requirement: Funciones de storage renombradas
Las funciones de almacenamiento local que contienen "Nodo" en su nombre DEBEN ser renombradas.

#### Scenario: Función getNodoRefId renombrada
- **WHEN** se obtiene el ID de referencia del aeropuerto desde localStorage
- **THEN** la función se llama `getAeropuertoRefId` en vez de `getNodoRefId`
- **AND** la key de localStorage sigue siendo `nodo_ref_id`

#### Scenario: Función setNodoRefId renombrada
- **WHEN** se guarda el ID de referencia del aeropuerto en localStorage
- **THEN** la función se llama `setAeropuertoRefId` en vez de `setNodoRefId`
- **AND** la key de localStorage sigue siendo `nodo_ref_id`

### Requirement: Variables y props renombradas
Todas las variables, props de componentes y estados que contienen "nodo" DEBEN ser renombradas a "aeropuerto".

#### Scenario: Estado de aeropuertos en OperacionView
- **WHEN** OperacionView se renderiza
- **THEN** el estado se llama `aeropuertos` en vez de `nodos`

#### Scenario: Estado de aeropuertos en SimulacionView
- **WHEN** SimulacionView se renderiza
- **THEN** los estados se llaman `initialAeropuertos` y `aeropuertosMapa` en vez de `initialNodos` y `nodosMapa`

#### Scenario: Props de GeoMapa
- **WHEN** GeoMapa recibe datos de aeropuertos
- **THEN** la prop se llama `aeropuertos` en vez de `nodos`

#### Scenario: Props de PanelAeropuertosOperacion
- **WHEN** PanelAeropuertosOperacion recibe datos
- **THEN** la prop se llama `aeropuertos` y el callback `onAeropuertoClick` en vez de `nodos` y `onNodoClick`

### Requirement: Tipo literal 'nodo' se mantiene
El discriminador de tipo `'nodo'` en `SelectedEnvioOperacion` y `SelectedEnvio` NO debe ser renombrado porque es un valor interno que coincide con el backend.

#### Scenario: Discriminador de tipo de envío
- **WHEN** un envío es de tipo aeropuerto
- **THEN** el discriminador `tipo` sigue siendo el string `'nodo'` en el frontend
- **AND** el texto visible al usuario dice "aeropuerto" donde corresponda