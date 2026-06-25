## ADDED Requirements

### Requirement: Tick de operación no bloqueante
El `OperacionTickService` DEBE ejecutar el ciclo de operación en vivo sin que el reseteo de vuelos bloquee la emisión de telemetría.

#### Scenario: Reseteo diario de vuelos
- **WHEN** inicia un nuevo día operativo (cambio de `LocalDate` en UTC)
- **AND** no hay ninguna sesión de simulación en curso
- **THEN** el sistema DEBE resetear/clonar los vuelos para la nueva fecha UNA SOLA VEZ
- **AND** NO DEBE volver a resetear/clonar hasta que cambie la fecha

#### Scenario: Tick secuencial sin solapamiento
- **WHEN** un tick de operación está en ejecución
- **THEN** el siguiente tick NO DEBE iniciar hasta que el anterior haya completado
- **AND** debe haber una pausa de al menos 1 segundo entre ticks

#### Scenario: Telemetría emitida en cada tick
- **WHEN** el tick de operación se ejecuta
- **AND** no hay sesión de simulación en curso
- **THEN** el sistema DEBE emitir telemetría a todos los clientes WebSocket conectados

### Requirement: Emisión asíncrona de telemetría
La emisión de telemetría vía WebSocket NO DEBE bloquear el ciclo principal del tick de operación.

#### Scenario: Broadcast asíncrono
- **WHEN** el tick de operación llama a `emitirTelemetria()`
- **THEN** el broadcast WebSocket DEBE ejecutarse en un hilo separado
- **AND** el tick DEBE continuar su ejecución sin esperar a que el broadcast complete
