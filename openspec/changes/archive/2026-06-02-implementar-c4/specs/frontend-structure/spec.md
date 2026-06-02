## ADDED Requirements

### Requirement: Runtime validation for estado fields from backend

Every `estado` field received from the backend (via REST, WebSocket, or SSE) that maps to a TypeScript union literal type SHALL be validated at runtime before use. A helper function SHALL check the value against the known valid values and provide a safe fallback for unrecognized values.

#### Scenario: Valid estado value received

- **WHEN** the backend sends a `VueloTelemetria` with `estado: "EN_RUTA"` via WebSocket
- **THEN** the runtime validator SHALL recognize `"EN_RUTA"` as valid
- **THEN** the typed value `"EN_RUTA"` SHALL be returned

#### Scenario: Unknown estado value received

- **WHEN** the backend sends a `VueloTelemetria` with `estado: "DESVIADO"` (not in the known union)
- **THEN** the runtime validator SHALL return the fallback value `"PROGRAMADO"`
- **THEN** the system SHALL NOT crash or render an invalid state

#### Scenario: Helper signature

- **WHEN** the helper function is called with any string
- **THEN** it SHALL return a value of the expected union type (`'PROGRAMADO' | 'EN_RUTA' | 'CANCELADO' | 'COMPLETADO'`)
- **THEN** TypeScript SHALL recognize the return type as the union, not `string`
