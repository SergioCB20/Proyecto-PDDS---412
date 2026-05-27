## Why

El sistema TAS FB2B requiere procesamiento asíncrono de planificación de equipajes para evitar bloqueos en los endpoints REST durante el cálculo de rutas con el motor greedy. Actualmente, el endpoint `POST /api/equipajes` procesa síncronamente la creación de `PlanViaje` y `SegmentoPlan`, lo que degrada la experiencia del operador cuando hay alta concurrencia.

Además, el frontend operativo necesita recibir notificaciones en tiempo real cuando un equipaje ha sido planificado exitosamente o ha fallado, para actualizar el mapa sin polling.

## What Changes

### B10 — Cola de planificación asíncrona (BC1 Infrastructure)

- **Migración V18**: Nueva tabla `cola_planificacion` en PostgreSQL con columnas `id`, `equipaje_id`, `tipo` (PLANIFICACION|REPLANIFICACION), `estado` (PENDIENTE|EN_PROCESO|COMPLETADO|FALLIDO), `intentos`, `error`, `fecha_creacion`, `fecha_procesado`. Índice compuesto en `(estado, fecha_creacion)`.
- **Entidad JPA**: `ColaPlanificacion.java` en `bc1/domain/` mapeada a la tabla.
- **Enums**: `EstadoCola.java` (PENDIENTE, EN_PROCESO, COMPLETADO, FALLIDO) y `TipoCola.java` (PLANIFICACION, REPLANIFICACION).
- **Repository**: `ColaPlanificacionRepository.java` con `@Lock(PESSIMISTIC_WRITE)` y query nativa `SELECT ... FOR UPDATE SKIP LOCKED` para evitar race conditions, más método `findByEstadoAndFechaCreacionBefore` para timeout de items huérfanos.
- **Worker**: `PlanificacionWorker.java` con `@Scheduled(fixedDelay = 500)` que toma items PENDIENTE uno a la vez, los marca EN_PROCESO, valida capacidades, ejecuta `MotorEnrutamiento.calcularRuta()`, persiste `PlanViaje` + `SegmentoPlan`, decrementa `cargaDisponible` e incrementa `ocupacionActual`, publica eventos, notifica SSE, y marca COMPLETADO o FALLIDO con reintentos (máx 3).
- **Timeout**: Items EN_PROCESO con más de 5 minutos se marcan FALLIDO con error "Timeout por crash".

### B12 — SSE notificaciones en tiempo real (shared / BC1)

- **SseService**: `SseService.java` en `shared/infrastructure/` con `ConcurrentHashMap<UUID, SseEmitter>`. Métodos: `registrar()`, `emitir()`, `broadcast()`, `eliminar()`. Maneja timeouts (`onTimeout` → `complete()`), desconexiones (`onCompletion` → eliminar del mapa), y errores. Loguea warning cuando no hay emisores conectados.
- **SSE Controller**: `PlanificacionSseController.java` en `bc1/infrastructure/` con `GET /api/eventos/planificacion` que retorna `SseEmitter`. Protegido con `@PreAuthorize("hasRole('OPERADOR_LOGISTICO')")`.
- **Integración Worker → SSE**: El `PlanificacionWorker` llama a `SseService.broadcast()` con eventos `planificacion-completada` y `planificacion-fallida` al completar o fallar items.

### Cambios adicionales

- `@EnableScheduling` agregado a `BackendApplication.java` para habilitar el worker.
- Ruta `/api/eventos/**` agregada a `SecurityConfig.java` como `authenticated()`.

### Dependencia: MotorEnrutamiento (creado como requisito del Worker)

- `MotorEnrutamiento.java` en `bc2/application/`: algoritmo greedy stateless que busca vuelo directo o conexión de 2 escalas (mín 60 min de conexión). Valida SLA y capacidad. Retorna `RutaResult` con segmentos.
- `EquipajePlanificadoEvent.java` y `PlanViajeCreado.java` en `shared/events/` como records.

## Capabilities

### New Capabilities
- `cola-planificacion-asincrona`: Procesamiento background de planificación de equipajes con cola PostgreSQL + SKIP LOCKED.
- `sse-notificaciones-operador`: Notificaciones en tiempo real al frontend operativo sobre estado de planificación de equipajes.

### Modified Capabilities
- `bc1-gestion-operativa.md`: Nueva tabla `cola_planificacion` (V18), nuevo endpoint SSE.
- `api-contracts.md`: Nuevo endpoint `GET /api/eventos/planificacion`.
- `shared-security`: Nuevo permiso para `/api/eventos/**`.

## Impact

### Archivos creados (11)

| Ruta | Propósito |
|---|---|
| `db/migration/V18__cola_planificacion.sql` | Migración Flyway |
| `bc1/domain/ColaPlanificacion.java` | Entidad JPA |
| `bc1/domain/EstadoCola.java` | Enum estados cola |
| `bc1/domain/TipoCola.java` | Enum tipos planificación |
| `bc1/infrastructure/ColaPlanificacionRepository.java` | Repository con SKIP LOCKED |
| `bc1/application/PlanificacionWorker.java` | Worker @Scheduled |
| `shared/infrastructure/SseService.java` | SSE emitter manager |
| `bc1/infrastructure/PlanificacionSseController.java` | SSE endpoint |
| `bc2/application/MotorEnrutamiento.java` | Motor greedy (dep worker) |
| `shared/events/EquipajePlanificadoEvent.java` | Evento interno worker |
| `shared/events/PlanViajeCreado.java` | Evento plan creado |

### Archivos modificados (3)

| Ruta | Cambio |
|---|---|
| `BackendApplication.java` | `@EnableScheduling` |
| `shared/security/SecurityConfig.java` | Ruta `/api/eventos/**` |
| `openspec/changes/sprint2-bc2-completar/tasks.md` | 14 tareas marcadas completas |

### Dependencias
- No se requieren nuevas dependencias externas. La cola usa PostgreSQL nativo (SKIP LOCKED). SSE usa `SseEmitter` de Spring MVC (ya incluido en `spring-boot-starter-web`).
