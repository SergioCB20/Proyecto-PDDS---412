## MODIFIED Requirements

### Requirement: Endpoint acepta sesionId opcional

El endpoint `GET /api/nodos/{iata}/envios` SHALL aceptar un query param opcional `sesionId` para filtrar los equipajes por una sesión de simulación específica. Si no se provee, funciona como antes (modo operación).

#### Scenario: Sin sesionId retorna equipajes de todas las sesiones
- **WHEN** se invoca `GET /api/nodos/LIM/envios` (sin `sesionId`)
- **THEN** el sistema retorna equipajes de todas las sesiones y producción

#### Scenario: Con sesionId retorna solo equipajes de esa sesión
- **WHEN** se invoca `GET /api/nodos/LIM/envios?sesionId=abc-123`
- **THEN** el sistema retorna solo equipajes cuyo plan de viaje pertenece a la sesión `abc-123`

### Requirement: Clasificación saliendo/llegando filtrada por sesión

Las 4 queries internas que clasifican equipajes en "saliendo" y "llegando" DEVEN filtrar por `sesionId` cuando se provee el parámetro.

#### Scenario: findEnRutadoSaliendoBySesion filtra por sesionId
- **WHEN** se invoca `findEnRutadoSaliendoBySesion(nodoIata, sesionId, ...)`
- **THEN** el query incluye `AND pv.sesionId = :sesionId` en el WHERE

#### Scenario: findEnAlmacenEnNodoBySesion filtra por sesionId
- **WHEN** se invoca `findEnAlmacenEnNodoBySesion(nodoIata, sesionId, ...)`
- **THEN** el query incluye `AND pv.sesionId = :sesionId` en el WHERE

#### Scenario: findEnVueloLlegandoBySesion filtra por sesionId
- **WHEN** se invoca `findEnVueloLlegandoBySesion(nodoIata, sesionId, ...)`
- **THEN** el query incluye `AND pv.sesionId = :sesionId` en el WHERE
