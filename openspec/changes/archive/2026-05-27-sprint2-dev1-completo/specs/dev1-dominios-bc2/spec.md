## ADDED Requirements

### Requirement: Entidades JPA para tablas BC2 existentes
El sistema SHALL tener entidades JPA para las tablas `items_lote`, `reportes_sesion`, y `puntos_sla` creadas por migraciones V15-V17.

#### Scenario: ItemLote mapea tabla items_lote
- **WHEN** se crea un ItemLote con loteId, equipajeRefId y estadoReplanificacion
- **THEN** el registro se persiste en `items_lote` con los campos correspondientes

#### Scenario: ReporteSesion mapea tabla reportes_sesion
- **WHEN** se crea un ReporteSesion con sesionId, slaIncumplidoPct y totalReplanificadas
- **THEN** el registro se persiste en `reportes_sesion` con los campos correspondientes

#### Scenario: PuntoSLA mapea tabla puntos_sla
- **WHEN** se crea un PuntoSLA con reporteId, momentoVirtual y slaPct
- **THEN** el registro se persiste en `puntos_sla` con los campos correspondientes

#### Scenario: Repositorios con consultas por ID
- **WHEN** se consulta ItemLoteRepository.findByLoteId, ReporteSesionRepository.findBySesionId, o PuntoSLARepository.findByReporteIdOrderByMomentoVirtual
- **THEN** se retornan los registros correspondientes ordenados cuando aplica
