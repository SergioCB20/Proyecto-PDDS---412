## ADDED Requirements

### Requirement: EquipajeService asíncrono
El sistema SHALL procesar el registro de equipajes de forma asíncrona: validar datos básicos, persistir equipaje con estado REGISTRADO, encolar en cola_planificacion, y responder 202 Accepted.

#### Scenario: Registro exitoso con 202
- **WHEN** se envía POST /api/equipajes con datos válidos
- **THEN** se crea Equipaje con estado REGISTRADO, se guarda en BD, se crea un item en cola_planificacion con tipo PLANIFICACION
- **AND** se retorna HTTP 202 Accepted con id, estado, id_externo y destino_iata (sin plan_viaje)

#### Scenario: Validación síncrona fallida
- **WHEN** se envía POST /api/equipajes con vuelo no PROGRAMADO o capacidad agotada
- **THEN** se retorna 422 Unprocessable Entity sin crear el equipaje ni encolar

### Requirement: CancelacionService con encolamiento asíncrono
El sistema SHALL, al cancelar un vuelo, marcarlo como CANCELADO y publicar VueloCanceladoEvent para que ReplanificacionService maneje el encolamiento de equipajes afectados.

#### Scenario: Cancelación exitosa
- **WHEN** se cancela un vuelo PROGRAMADO o EN_RUTA
- **THEN** el vuelo se marca CANCELADO, se actualiza Redis, y se publica VueloCanceladoEvent
- **AND** ReplanificacionService recibe el evento y encola los equipajes afectados

#### Scenario: Cancelación inválida
- **WHEN** se intenta cancelar un vuelo COMPLETADO o CANCELADO
- **THEN** se retorna error 422 CancelacionInvalida
