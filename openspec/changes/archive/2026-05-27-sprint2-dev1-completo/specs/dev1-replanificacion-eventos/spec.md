## ADDED Requirements

### Requirement: ReplanificacionService con escucha de eventos
El sistema SHALL tener un ReplanificacionService que escuche VueloCanceladoEvent y también exponga un método directo para uso desde TickService con contexto de sesión.

#### Scenario: EventListener para cancelaciones manuales (BC1)
- **WHEN** BC1 publica VueloCanceladoEvent sin sesionId
- **THEN** ReplanificacionService identifica equipajes con vueloActual = vueloId, los marca EN_REPLANIFICACION, y encada cada uno en cola_planificacion con tipo REPLANIFICACION

#### Scenario: Método directo para cancelaciones en simulación (BC2)
- **WHEN** TickService llama a replanificarEnSesion(sesionId, vueloId, causa, momentoVirtual)
- **THEN** se crea EventoCancelacion, LoteReplanificacion y un ItemLote por cada equipaje afectado
- **AND** se encolan los equipajes en cola_planificacion con tipo REPLANIFICACION
- **AND** se incrementa maletas_replanificadas y vuelos_cancelados en la sesión
- **AND** se publica ReplanificacionIniciada

#### Scenario: EventoCancelacion registra cancelación
- **WHEN** se cancela un vuelo durante simulación
- **THEN** se crea EventoCancelacion con sesionId, vueloRefId, fuente, causa, y ocurridoEnVirtual

#### Scenario: LoteReplanificacion agrupa equipajes afectados
- **WHEN** se cancela un vuelo con N equipajes afectados
- **THEN** se crea un LoteReplanificacion con totalEquipajes = N y estado PENDIENTE
