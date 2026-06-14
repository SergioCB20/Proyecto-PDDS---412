## ADDED Requirements

### Requirement: Telemetría de nodos incluye continente y zona horaria

El payload de telemetría WebSocket para cada nodo SHALL incluir los campos `continente` y `zona_horaria` como strings.

#### Scenario: Nodo con continente definido
- **WHEN** el backend genera el JSON de telemetría para un nodo que tiene `continente`
- **THEN** el JSON SHALL incluir `"continente": "South America"`

#### Scenario: Nodo sin continente
- **WHEN** el nodo no tiene `continente` (null)
- **THEN** el JSON SHALL incluir `"continente": ""`
