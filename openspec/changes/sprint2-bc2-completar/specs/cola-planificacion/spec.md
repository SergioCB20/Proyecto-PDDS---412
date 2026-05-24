## ADDED Requirements

### Requirement: Cola de planificación asíncrona en PostgreSQL
El sistema SHALL procesar toda planificación y replanificación de equipajes a través de una cola persistente en PostgreSQL (`cola_planificacion`) que garantice procesamiento FIFO sin race conditions. La cola SHALL tener un worker background que tome items uno a la vez usando `SELECT ... FOR UPDATE SKIP LOCKED`.

#### Scenario: Tabla cola_planificacion
- **GIVEN** la migración V18 ha sido ejecutada
- **THEN** existe la tabla `cola_planificacion` con columnas: `id` (UUID PK), `equipaje_id` (FK → equipajes), `tipo` (PLANIFICACION|REPLANIFICACION), `estado` (PENDIENTE|EN_PROCESO|COMPLETADO|FALLIDO), `intentos` (INT DEFAULT 0), `error` (TEXT), `fecha_creacion` (TIMESTAMPTZ), `fecha_procesado` (TIMESTAMPTZ)
- **AND** existe un índice en `(estado, fecha_creacion)`

### Requirement: Registro de maleta encolado asíncronamente
El endpoint `POST /api/equipajes` SHALL guardar el Equipaje con estado `REGISTRADO`, insertar un item en `cola_planificacion` con tipo=PLANIFICACION, y responder 202 Accepted inmediatamente. El plan de viaje NO se calcula durante el request.

#### Scenario: Registro exitoso
- **WHEN** un operador envía `POST /api/equipajes` con datos válidos
- **THEN** se guarda el `Equipaje` con estado `REGISTRADO`
- **AND** se inserta un registro en `cola_planificacion` con `tipo=PLANIFICACION`, `estado=PENDIENTE`
- **AND** el endpoint responde HTTP 202 Accepted con body `{ "equipaje_id": "uuid", "estado_cola": "PENDIENTE" }`

### Requirement: Worker procesa items secuencialmente con SKIP LOCKED
El sistema SHALL ejecutar un `PlanificacionWorker` con `@Scheduled(fixedDelay = 500)` que tome items de `cola_planificacion` en orden FIFO usando bloqueo a nivel de fila sin bloquear otros workers.

#### Scenario: Worker toma item pendiente
- **WHEN** el worker ejecuta su ciclo y existen items PENDIENTE
- **THEN** ejecuta `SELECT * FROM cola_planificacion WHERE estado = 'PENDIENTE' ORDER BY fecha_creacion ASC LIMIT 1 FOR UPDATE SKIP LOCKED`
- **AND** marca el item como `EN_PROCESO`
- **AND** procede a procesarlo (MotorEnrutamiento → persistir PlanViaje → actualizar capacidades)

#### Scenario: Múltiples workers no compiten por el mismo item
- **WHEN** existen 2 workers ejecutándose simultáneamente (ej. reinicio de instancia)
- **THEN** cada worker ejecuta `SKIP LOCKED` y obtiene items diferentes
- **AND** ningún item es procesado por más de un worker a la vez

### Requirement: Planificación exitosa
El worker SHALL crear el `PlanViaje` completo (con `SegmentoPlan`), decrementar `cargaDisponible` del vuelo, incrementar `ocupacionActual` del nodo origen, y actualizar el `Equipaje` a estado `ENRUTADO`.

#### Scenario: Worker completa planificación de registro
- **WHEN** el worker procesa un item tipo PLANIFICACION
- **AND** el vuelo tiene `cargaDisponible > 0` y el nodo tiene `ocupacionActual < capacidadAlmacen`
- **THEN** se crea `PlanViaje` con un `SegmentoPlan`
- **AND** `vuelo.cargaDisponible` se decrementa en 1
- **AND** `nodoOrigen.ocupacionActual` se incrementa en 1
- **AND** `Equipaje.estado` cambia a `ENRUTADO`
- **AND** el item de cola se marca como `COMPLETADO` con `fecha_procesado = NOW()`

### Requirement: Manejo de fallos y reintentos
El worker SHALL incrementar `intentos` cuando falla el procesamiento de un item, y marcarlo como `FALLIDO` si excede el límite de reintentos (3 por defecto).

#### Scenario: Reintento por validación fallida
- **WHEN** el worker procesa un item pero `cargaDisponible` del vuelo es 0
- **THEN** incrementa `intentos` en 1
- **AND** guarda el mensaje de error en `error`
- **AND** si `intentos < 3`, deja el item como `PENDIENTE` para reintentar
- **AND** si `intentos >= 3`, marca el item como `FALLIDO`
- **AND** el `Equipaje` se marca como `INCUMPLIMIENTO_SLA`

### Requirement: Timeout de items huérfanos por crash
El worker SHALL detectar y marcar como `FALLIDO` los items que permanezcan en estado `EN_PROCESO` por más de 5 minutos, para evitar que items huérfanos bloqueen el procesamiento tras un crash.

#### Scenario: Timeout de item huérfano
- **WHEN** el worker ejecuta su ciclo y existe un item en EN_PROCESO con `fecha_creacion < NOW() - 5 minutes`
- **THEN** marca el item como `FALLIDO` con error "Timeout por crash"
- **AND** el `Equipaje` asociado se marca como `INCUMPLIMIENTO_SLA`

### Requirement: Replanificación usa la misma cola
Cuando se cancela un vuelo, el sistema SHALL encolar los equipajes afectados en la misma `cola_planificacion` con tipo `REPLANIFICACION`, y el worker los procesa exactamente igual que los items de planificación inicial.

#### Scenario: Cancelación encola replanificación
- **WHEN** se cancela un vuelo vía `POST /api/vuelos/{id}/cancelar`
- **THEN** se marcan los equipajes afectados como `EN_REPLANIFICACION`
- **AND** se inserta un item en `cola_planificacion` por cada equipaje con `tipo=REPLANIFICACION`, `estado=PENDIENTE`
- **AND** el `PlanificacionWorker` procesa estos items en su siguiente ciclo

### Requirement: Notificación SSE al frontend
El sistema SHALL notificar al frontend vía Server-Sent Events cuando el worker completa o falla el procesamiento de un item de la cola.

#### Scenario: Evento planificacion-completada
- **WHEN** el worker marca un item como `COMPLETADO`
- **THEN** emite un evento SSE `planificacion-completada` con payload `{ equipaje_id, estado, plan_viaje: { segmentos: [...] } }`

#### Scenario: Evento planificacion-fallida
- **WHEN** el worker marca un item como `FALLIDO`
- **THEN** emite un evento SSE `planificacion-fallida` con payload `{ equipaje_id, error }`

#### Scenario: Frontend se suscribe a SSE
- **WHEN** el frontend carga la página de operación (`/operacion`)
- **THEN** abre una conexión SSE a `GET /api/eventos/planificacion`
- **AND** recibe eventos en tiempo real para actualizar el mapa sin polling
