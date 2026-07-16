## MODIFIED Requirements

### Requirement: Panel de Envíos de Maletas (Simulación)
El sistema SHALL proveer un endpoint `GET /api/sesiones/{id}/envios/envios-panel` equivalente al de operación pero scoped a una sesión de simulación, y la implementación DEBE filtrar los equipajes por `sesion_id` en la base de datos (no en memoria).

#### Scenario: Obtener envíos en vuelo scoped a sesión
- **WHEN** se invoca `GET /api/sesiones/{id}/envios/envios-panel?tipo=en_vuelo`
- **THEN** el sistema retorna maletas en estado EN_VUELO pertenecientes a la sesión indicada

#### Scenario: Obtener envíos planificados scoped a sesión con filtro de destino
- **WHEN** se invoca `GET /api/sesiones/{sesionId}/envios/envios-panel?tipo=planificados&destino_iata=MIA`
- **THEN** el sistema retorna maletas planificadas de la sesión con destino_iata = MIA

#### Scenario: SesionId se filtra en SQL no en memoria
- **WHEN** se invoca `GET /api/sesiones/{id}/envios/envios-panel?tipo=planificados`
- **AND** existen equipajes de otras sesiones
- **THEN** el query SQL incluye `WHERE pv.sesionId = :sesionId`
- **AND** solo retorna equipajes de la sesión solicitada
