## ADDED Requirements

### Requirement: Heartbeat automático en WebSocket de telemetría
El sistema DEBE emitir un heartbeat periódico a través del WebSocket de telemetría para mantener la conexión activa cuando no haya datos de telemetría disponibles.

#### Scenario: Heartbeat enviado sin telemetría
- **WHEN** el WebSocket de telemetría tiene al menos un cliente conectado
- **AND** han transcurrido 10 segundos desde el último mensaje enviado
- **THEN** el sistema DEBE enviar un mensaje JSON `{"type":"heartbeat"}` a todos los clientes conectados

#### Scenario: Heartbeat no interfiere con telemetría
- **WHEN** el sistema está enviando datos de telemetría regularmente
- **AND** los mensajes de telemetría se envían con frecuencia menor a 10 segundos
- **THEN** el heartbeat NO DEBE duplicar ni reemplazar los mensajes de telemetría

#### Scenario: Heartbeat ignorado por frontend
- **WHEN** el frontend recibe un mensaje WebSocket con `type: "heartbeat"`
- **THEN** el frontend NO DEBE actualizar el estado de telemetría ni renderizar componentes
- **AND** el frontend DEBE mantener el indicador de conexión como "conectado"

### Requirement: Conexión permanente del WebSocket durante operación
El WebSocket de telemetría de operación DEBE mantenerse conectado de forma permanente mientras la página de operación esté abierta.

#### Scenario: Reconexión automática
- **WHEN** la conexión WebSocket se cierra por cualquier motivo
- **THEN** el frontend DEBE intentar reconectar automáticamente después de 3 segundos
- **AND** el indicador de conexión DEBE mostrar "desconectado" durante el período de reconexión

#### Scenario: Timeout extendido en proxy reverso
- **WHEN** Nginx recibe una conexión WebSocket hacia `/back/api/ws/telemetria`
- **THEN** el timeout de lectura (`proxy_read_timeout`) DEBE ser de al menos 3600 segundos
