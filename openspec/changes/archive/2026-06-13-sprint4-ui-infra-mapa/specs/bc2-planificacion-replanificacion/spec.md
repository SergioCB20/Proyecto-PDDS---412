## MODIFIED Requirements

### Requirement: API exposes `fecha_inicio_real` in metrics response
The `MetricasSesionResponse` DTO SHALL include a new field `fecha_inicio_real` of type `OffsetDateTime`. The `GET /sesiones/{id}/metricas` endpoint SHALL return this field when the session has been started, or `null` when the session is `CONFIGURADA`. The `TickService.buildMetricasJson()` method SHALL include this field in the Redis cache JSON.

#### Scenario: fecha_inicio_real present in metrics response
- **WHEN** `GET /api/sesiones/{id}/metricas` is called for a session that has been started (estado is `EN_CURSO`, `PAUSADA`, or `FINALIZADA`)
- **THEN** the response SHALL include `"fecha_inicio_real": "2025-06-10T09:00:00Z"` (ISO 8601)

#### Scenario: fecha_inicio_real is null before session starts
- **WHEN** `GET /api/sesiones/{id}/metricas` is called for a session in `CONFIGURADA` state
- **THEN** the response SHALL include `"fecha_inicio_real": null`

#### Scenario: Redis cache includes fecha_inicio_real
- **WHEN** TickService builds the metrics JSON for Redis cache
- **THEN** the JSON SHALL include `"fecha_inicio_real"` with the session's `fechaInicioReal` value in ISO 8601 format
