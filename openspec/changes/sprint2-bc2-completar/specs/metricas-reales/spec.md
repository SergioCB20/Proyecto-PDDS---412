## ADDED Requirements

### Requirement: Métricas reales desde Redis
El endpoint `GET /sesiones/{id}/metricas` SHALL leer las métricas desde Redis (`sesion:{id}:metricas`) en lugar de retornar datos dummy.

#### Scenario: Métricas leídas de Redis
- **WHEN** se consulta `GET /sesiones/{id}/metricas` para una sesión EN_CURSO
- **THEN** se retorna el JSON almacenado en Redis con campos: sesion_id, estado, dia_hora_virtual, segundos_reales_transcurridos, sla_acumulado_pct, vuelos_cancelados, maletas_replanificadas

#### Scenario: Redis no disponible
- **WHEN** se consulta `GET /sesiones/{id}/metricas` y Redis no está disponible
- **THEN** se retorna un error 500 con mensaje indicando que Redis no está disponible

### Requirement: Estado de sesión en Redis
El sistema SHALL mantener la clave `sesion:{id}:estado` en Redis actualizada con el estado actual de la sesión (`EN_CURSO`, `PAUSADA`, `FINALIZADA`, `COLAPSADA`).

#### Scenario: Estado actualizado al cambiar
- **WHEN** una sesión cambia de estado (iniciar, pausar, detener, colapsar)
- **THEN** se escribe `sesion:{id}:estado` en Redis con el nuevo estado

### Requirement: Limpieza de métricas al finalizar
Al finalizar una sesión, el sistema SHALL eliminar las claves `sesion:{id}:metricas` y `sesion:{id}:estado` de Redis.

#### Scenario: Métricas eliminadas al finalizar
- **WHEN** una sesión cambia a `FINALIZADA` o `COLAPSADA`
- **THEN** se eliminan `sesion:{id}:metricas` y `sesion:{id}:estado` de Redis
