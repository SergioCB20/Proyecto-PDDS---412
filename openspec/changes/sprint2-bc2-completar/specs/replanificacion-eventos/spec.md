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

### Requirement: Replanificación de cada equipaje
Para cada `ItemLote` en el lote, el sistema SHALL llamar al `MotorEnrutamiento` para obtener una nueva ruta y evaluar si respeta el SLA.

#### Scenario: Nueva ruta respeta SLA
- **WHEN** el motor retorna un `PlanViaje` con segmentos y tiempo_entrega_est <= sla_comprometido
- **THEN** el `ItemLote` se marca como `ENRUTADO` y el equipaje se actualiza a `ENRUTADO`

#### Scenario: Nueva ruta no respeta SLA
- **WHEN** el motor retorna un `PlanViaje` sin segmentos o con tiempo_entrega_est > sla_comprometido
- **THEN** el `ItemLote` se marca como `INCUMPLIMIENTO_SLA` y el equipaje se actualiza a `INCUMPLIMIENTO_SLA`

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
