## Context

BC1 (Gestión Operativa) maneja el registro, planificación y seguimiento de equipajes. Hasta ahora, la creación del `PlanViaje` se realizaba sincrónicamente durante el request `POST /api/equipajes`, lo que acoplaba la validación con el cálculo de ruta. Para soportar replanificación asíncrona (BC2) y mejorar la capacidad de respuesta, se introduce una cola de planificación persistente en PostgreSQL.

El frontend operativo necesita actualizar el mapa en tiempo real cuando un equipaje es planificado — sin polling HTTP. SSE (Server-Sent Events) es el mecanismo elegido por su simplicidad sobre WebSocket para este flujo unidireccional servidor → cliente.

## Goals / Non-Goals

**Goals:**
- Cola de planificación asíncrona FIFO con procesamiento transaccional via SKIP LOCKED
- Worker background que procesa items cada 500ms
- Timeout automático de items huérfanos (> 5 min EN_PROCESO)
- Reintentos automáticos (máx 3) con backoff en error
- SSE para notificar al frontend eventos `planificacion-completada` y `planificacion-fallida`
- Manejo de múltiples conexiones SSE concurrentes

**Non-Goals:**
- No se implementa WebSocket (reservado para telemetría BC2)
- No se modifica EquipajeService.registrar() para encolar (es B11, Dev 1)
- No se implementa ReplanificacionService (es B6, Dev 1)
- No se implementa Redis para la cola (PostgreSQL + SKIP LOCKED es transaccional)

## Decisions

### D1: Cola en PostgreSQL con SKIP LOCKED vs Redis queue
**Decisión:** Usar PostgreSQL con `SELECT ... FOR UPDATE SKIP LOCKED`.
**Razón:** Es transaccional — si el worker crashea, la transacción se revierte y el item sigue PENDIENTE (con timeout de 5 min). No requiere infraestructura adicional. Redis queue fue rechazado por falta de atomicidad transaccional.
**Alternativa:** Redis BRPOPLPUSH — rechazado porque no es transaccional con PostgreSQL.

### D2: Worker @Scheduled vs Message Queue externa
**Decisión:** Usar `@Scheduled(fixedDelay = 500)` de Spring.
**Razón:** Simple, nativo, suficiente para volúmenes académicos. No requiere RabbitMQ/Kafka.
**Alternativa:** RabbitMQ — rechazado por sobreingeniería para el alcance del proyecto.

### D3: SseEmitter con ConcurrentHashMap vs Reactive
**Decisión:** `ConcurrentHashMap<UUID, SseEmitter>` con métodos `registrar`, `emitir`, `broadcast`, `eliminar`.
**Razón:** Simple, thread-safe, sin dependencias reactivas. El broadcast permite al worker notificar a todos los clientes conectados sin conocer sus sessionId individuales.

### D4: SSE vs WebSocket para notificaciones operativas
**Decisión:** SSE para notificaciones de planificación; WebSocket para telemetría de simulación (B9).
**Razón:** SSE es unidireccional (solo servidor → cliente), más simple, nativo de Spring MVC. WebSocket se reserva para telemetría bidireccional con mayor frecuencia de eventos.
**Alternativa:** WebSocket unificado — rechazado porque mezcla dos canales distintos con diferentes requisitos.

### D5: PreAuthorize en SSE endpoint
**Decisión:** `@PreAuthorize("hasRole('OPERADOR_LOGISTICO')")` en `PlanificacionSseController`.
**Razón:** Solo los operadores logísticos deben recibir notificaciones de planificación. Consistente con el resto del security config.

### D6: MotorEnrutamiento como Domain Service en bc2
**Decisión:** `MotorEnrutamiento` se crea en `bc2/application/` como `@Service` stateless.
**Razón:** El worker lo necesita para calcular rutas. Se separa del worker para mantenerlo testeable y reutilizable por ReplanificacionService (B6). Aunque técnicamente es tarea de Dev 1, se implementa como dependencia necesaria del worker.

### D7: Reintentos con backoff simple
**Decisión:** 3 intentos máximos; si falla, se incrementa `intentos` y se deja PENDIENTE para reintentar; al llegar a 3, se marca FALLIDO y el equipaje pasa a INCUMPLIMIENTO_SLA.
**Razón:** Balance entre resiliencia y no bloquear la cola indefinidamente.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Worker crashea con item EN_PROCESO | Timeout de 5 min → item se marca FALLIDO automáticamente |
| Múltiples workers compiten por mismo item | SKIP LOCKED garantiza que cada item se procese una sola vez |
| SseEmitter consume memoria si no se limpia | Callbacks onCompletion/onTimeout/onError eliminan del mapa |
| SSE se desconecta | El controller crea un nuevo emitter en cada conexión |
| MotorEnrutamiento sin sesionId | El worker acepta null como sesionId por ahora |
