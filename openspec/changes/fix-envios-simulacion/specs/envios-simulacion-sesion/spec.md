## ADDED Requirements

### Requirement: SesionId se propaga desde vista a componentes de panel

En modo simulación, el `sesionId` DEBE propagarse desde la vista (`page.tsx`) a través de los componentes `PanelTabs`, `PanelAeropuertosOperacion` hasta `DetalleEnviosAeropuerto` para que los fetch de datos incluyan el filtro por sesión.

#### Scenario: PanelTabs recibe sesionId y lo pasa a PanelAeropuertosOperacion
- **WHEN** `PanelTabs` recibe `sesionId` como prop
- **THEN** DEBE pasarlo a `PanelAeropuertosOperacion`

#### Scenario: PanelAeropuertosOperacion recibe sesionId y lo pasa a DetalleEnviosAeropuerto
- **WHEN** `PanelAeropuertosOperacion` recibe `sesionId` como prop
- **AND** hay un aeropuerto seleccionado
- **THEN** DEBE pasarlo a `DetalleEnviosAeropuerto`

#### Scenario: DetalleEnviosAeropuerto usa sesionId en el fetch
- **WHEN** `DetalleEnviosAeropuerto` recibe `sesionId`
- **THEN** DEBE llamar a `fetchEnviosNodoConClasificacion(iata, sesionId)`

### Requirement: fetchEnviosNodoConClasificacion acepta sesionId opcional

La función `fetchEnviosNodoConClasificacion` DEBE aceptar un parámetro opcional `sesionId` y, si está presente, enviarlo como query param `?sesionId=...` en la petición.

#### Scenario: Sin sesionId no envía query param
- **WHEN** se llama `fetchEnviosNodoConClasificacion("LIM")`
- **THEN** la petición es `GET /api/nodos/LIM/envios`

#### Scenario: Con sesionId lo envía como query param
- **WHEN** se llama `fetchEnviosNodoConClasificacion("LIM", "abc-123")`
- **THEN** la petición es `GET /api/nodos/LIM/envios?sesionId=abc-123`

### Requirement: DetalleEnviosAeropuerto incluye sesionId en props

El componente `DetalleEnviosAeropuerto` DEBE aceptar un prop opcional `sesionId` de tipo `string`.

#### Scenario: sesionId es opcional
- **WHEN** el componente se usa sin `sesionId`
- **THEN** funciona igual que antes (modo operación)
