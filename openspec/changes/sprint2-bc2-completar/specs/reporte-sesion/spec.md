## ADDED Requirements

### Requirement: Generación de reporte al finalizar sesión
El sistema SHALL generar automáticamente un `ReporteSesion` cuando una sesión cambie a `FINALIZADA` o `COLAPSADA`.

#### Scenario: Reporte generado al finalizar
- **WHEN** una sesión cambia a `FINALIZADA` o `COLAPSADA`
- **THEN** se crea un `ReporteSesion` con `sla_incumplido_pct`, `total_replanificadas`, y serie SLA

### Requirement: Cálculo de SLA incumplido
El sistema SHALL calcular `sla_incumplido_pct` como (equipajes con INCUMPLIMIENTO_SLA / total equipajes) * 100.

#### Scenario: Cálculo correcto del porcentaje
- **WHEN** se genera el reporte con 100 equipajes totales y 5 en INCUMPLIMIENTO_SLA
- **THEN** `sla_incumplido_pct` = 5.0

### Requirement: Serie temporal SLA
El reporte SHALL incluir `serie_sla` como lista de `PuntoSLA` ordenados por `momento_virtual`, cada uno con `hubo_cancelacion` y opcionalmente `vuelo_cancelado_ref_id`.

#### Scenario: Serie SLA completa
- **WHEN** se consulta el reporte de una sesión finalizada
- **THEN** `serie_sla` contiene todos los `PuntoSLA` registrados durante la simulación ordenados cronológicamente

### Requirement: Detección de punto de colapso
Si la sesión colapsó, el reporte SHALL incluir `punto_colapso_virtual` (timestamp virtual), `nodo_colapso_ref_id`, y `causa_colapso`.

#### Scenario: Reporte con colapso
- **WHEN** la sesión está en estado `COLAPSADA`
- **THEN** el reporte incluye `punto_colapso_virtual`, `nodo_colapso_ref_id`, y `causa_colapso` no nulos

#### Scenario: Reporte sin colapso
- **WHEN** la sesión está en estado `FINALIZADA` (sin colapso)
- **THEN** `punto_colapso_virtual`, `nodo_colapso_ref_id`, y `causa_colapso` son null
