## MODIFIED Requirements

### Requirement: Estrategia de obtención de telemetría

El frontend SHALL priorizar WebSocket como fuente principal de telemetría. El polling HTTP (`GET /api/sesiones/{id}/metricas`) SHALL activarse solo como fallback cuando el WebSocket esté desconectado.

#### Scenario: WS conectado — polling detenido
- **WHEN** el WebSocket está conectado (`connected === true`)
- **THEN** el polling `fetchMetricas` NO se ejecuta

#### Scenario: WS desconectado — polling activo
- **WHEN** el WebSocket está desconectado (`connected === false`) y la sesión está `EN_CURSO`
- **THEN** el polling se ejecuta cada 3 segundos

#### Scenario: WS se reconecta — polling se detiene
- **WHEN** el WebSocket se reconecta (`connected` cambia de `false` a `true`)
- **THEN** el polling se limpia y deja de ejecutarse
