## ADDED Requirements

### Requirement: Telemetría de vuelos incluye hora de salida y llegada

El payload de telemetría WebSocket para cada vuelo SHALL incluir los campos `hora_salida` y `hora_llegada` como strings en formato ISO 8601. Estos campos SHALL ser opcionales para consumidores existentes (no rompen compatibilidad).

#### Scenario: Vuelo con horas definidas
- **WHEN** el backend genera el JSON de telemetría para un vuelo que tiene `horaSalida` y `horaLlegada`
- **THEN** el JSON SHALL incluir `"hora_salida": "2025-06-10T14:30:00Z"` y `"hora_llegada": "2025-06-10T18:45:00Z"`

#### Scenario: Vuelo sin hora de salida
- **WHEN** el vuelo no tiene `horaSalida` (null)
- **THEN** el JSON SHALL incluir `"hora_salida": ""`
