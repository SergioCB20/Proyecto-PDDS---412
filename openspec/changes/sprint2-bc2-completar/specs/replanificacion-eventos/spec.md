## ADDED Requirements

### Requirement: Escucha de VueloCanceladoEvent
El sistema SHALL tener un `ReplanificacionService` que escuche `VueloCanceladoEvent` publicado por BC1 y ejecute el proceso de replanificación automáticamente.

#### Scenario: Recepción de evento de cancelación
- **WHEN** BC1 publica un `VueloCanceladoEvent` con un vueloId
- **THEN** `ReplanificacionService` identifica todos los `SegmentoPlan` PENDIENTE o EN_CURSO que referencian ese vuelo

### Requirement: Creación de lote de replanificación
El sistema SHALL crear un `LoteReplanificacion` que agrupe todos los equipajes afectados por la cancelación, con sus respectivos `ItemLote`.

#### Scenario: Lote creado con equipajes afectados
- **WHEN** se identifican equipajes afectados por un vuelo cancelado
- **THEN** se crea un `LoteReplanificacion` con estado `PENDIENTE` y un `ItemLote` por cada equipaje afectado

### Requirement: Items encolados para replanificación asíncrona
Tras crear el lote y los items, el sistema SHALL encolar cada equipaje afectado en `cola_planificacion` con tipo `REPLANIFICACION`. El `PlanificacionWorker` (BC1) SHALL tomar estos items de la cola uno a la vez usando `SELECT ... FOR UPDATE SKIP LOCKED` y llamar al `MotorEnrutamiento` para procesarlos.

#### Scenario: Items encolados al cancelar vuelo
- **WHEN** se cancela un vuelo y se identifican equipajes afectados
- **THEN** se crea un `ItemLote` por cada equipaje en la BD de simulación
- **AND** se inserta un registro en `cola_planificacion` por cada equipaje con tipo=REPLANIFICACION, estado=PENDIENTE
- **AND** el `PlanificacionWorker` procesa los items asíncronamente

#### Scenario: Worker replanifica con nueva ruta
- **WHEN** el `PlanificacionWorker` toma un item REPLANIFICACION de la cola
- **AND** `MotorEnrutamiento.calcularRuta()` retorna un `PlanViaje` con segmentos
- **THEN** se persiste el `PlanViaje`, se actualiza el equipaje a `ENRUTADO`, se decrementan capacidades
- **AND** se emite evento SSE `planificacion-completada`

#### Scenario: Worker replanifica sin ruta posible
- **WHEN** el `PlanificacionWorker` toma un item REPLANIFICACION de la cola
- **AND** `MotorEnrutamiento.calcularRuta()` retorna sin segmentos
- **THEN** el equipaje se marca como `INCUMPLIMIENTO_SLA`
- **AND** se emite evento SSE `planificacion-fallida`

### Requirement: Publicación de ReplanificacionIniciada
El sistema SHALL publicar un evento `ReplanificacionIniciada` al comenzar el proceso de replanificación de un lote.

#### Scenario: Evento publicado al iniciar replanificación
- **WHEN** se crea un `LoteReplanificacion` y se comienza a procesar
- **THEN** se publica `ReplanificacionIniciada` con el loteId y sesionId

### Requirement: Actualización de métricas
El sistema SHALL incrementar el contador `maletas_replanificadas` en las métricas de la sesión por cada equipaje replanificado.

#### Scenario: Contador incrementado
- **WHEN** un `ItemLote` cambia a `ENRUTADO` o `INCUMPLIMIENTO_SLA`
- **THEN** `maletas_replanificadas` de la sesión se incrementa en 1
