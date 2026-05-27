## ADDED Requirements

### Requirement: ReporteService genera reporte al finalizar sesión
El sistema SHALL generar automáticamente un ReporteSesion al recibir SesionFinalizadaEvent.

#### Scenario: Reporte generado al finalizar
- **WHEN** SesionService.detenerSesion() o TickService emiten SesionFinalizadaEvent
- **THEN** ReporteService crea ReporteSesion con sla_incumplido_pct, total_replanificadas, y serie_sla desde PuntoSLARepository

#### Scenario: Cálculo de SLA incumplido
- **WHEN** se genera el reporte con N equipajes totales y M en INCUMPLIMIENTO_SLA
- **THEN** sla_incumplido_pct = (M / N) * 100

### Requirement: MetricasController expone endpoints de métricas y reporte
El sistema SHALL tener un MetricasController con GET /sesiones/{id}/metricas y GET /sesiones/{id}/reporte.

#### Scenario: GET metricas desde Redis
- **WHEN** se consulta GET /sesiones/{id}/metricas
- **THEN** se retorna MetricasSesionResponse leído desde Redis (o fallback a BD)

#### Scenario: GET reporte de sesión finalizada
- **WHEN** se consulta GET /sesiones/{id}/reporte y existe reporte
- **THEN** se retorna ReporteSesionResponse con serie_sla

#### Scenario: GET reporte de sesión sin reporte
- **WHEN** se consulta GET /sesiones/{id}/reporte y no existe reporte
- **THEN** se retorna HTTP 204 No Content
