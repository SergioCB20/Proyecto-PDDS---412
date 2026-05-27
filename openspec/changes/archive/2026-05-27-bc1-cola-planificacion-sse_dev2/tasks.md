## B10 — Cola de planificación asíncrona

- [x] 0.1 Crear migración `V18__cola_planificacion.sql` con tabla + índice
- [x] 0.2 Crear `ColaPlanificacion.java` entidad JPA en `bc1/domain/`
- [x] 0.3 Crear `EstadoCola.java` enum: PENDIENTE, EN_PROCESO, COMPLETADO, FALLIDO
- [x] 0.4 Crear `TipoCola.java` enum: PLANIFICACION, REPLANIFICACION
- [x] 0.5 Crear `ColaPlanificacionRepository.java` en `bc1/infrastructure/` con:
  - `@Lock(PESSIMISTIC_WRITE)` + query nativa `SELECT ... FOR UPDATE SKIP LOCKED`
  - `findByEstadoAndFechaCreacionBefore` para timeout
- [x] 0.6 Crear `PlanificacionWorker.java` en `bc1/application/` con `@Scheduled(fixedDelay = 500)`:
  - Tomar item PENDIENTE con SKIP LOCKED → EN_PROCESO
  - Validar `cargaDisponible > 0` y `ocupacionActual < capacidadAlmacen`
  - Llamar `MotorEnrutamiento.calcularRuta()`
  - Crear `PlanViaje` + `SegmentoPlan` y persistir
  - Decrementar `cargaDisponible` e incrementar `ocupacionActual`
  - Publicar eventos `EquipajePlanificadoEvent` y `PlanViajeCreado`
  - Notificar SSE via broadcast
  - Marcar COMPLETADO o FALLIDO (máx 3 reintentos)
- [x] 0.7 Ejecutar query de timeout: items EN_PROCESO > 5 min → FALLIDO "Timeout por crash"

## MotorEnrutamiento (dependencia del Worker)

- [x] 3.1 Crear `MotorEnrutamiento.java` en `bc2/application/` (stateless, @Service)
- [x] 3.2 Implementar `calcularRuta(NodoLogistico, String destinoIata, OffsetDateTime slaComprometido)`
- [x] 3.3 Búsqueda de vuelo directo (origen → destino, carga > 0, dentro de SLA)
- [x] 3.4 Búsqueda de conexión de 2 escalas (mín 60 min entre conexión)
- [x] 3.5 Validación de SLA (hora_llegada <= sla_comprometido)
- [x] 3.6 Validación de capacidad (cargaDisponible > 0)

## Eventos publicados

- [x] 2.1 Crear `PlanViajeCreado.java` record en `shared/events/`
- [x] — Crear `EquipajePlanificadoEvent.java` record en `shared/events/` (evento interno)

## B12 — SSE notificaciones en tiempo real

- [x] 5b.1 Crear `SseService.java` en `shared/infrastructure/` con:
  - `ConcurrentHashMap<UUID, SseEmitter>` para emisores
  - `registrar(UUID)`, `emitir(UUID, String, Object)`, `broadcast(String, Object)`, `eliminar(UUID)`
  - Callbacks: onCompletion → remove, onTimeout → complete+remove, onError → remove
  - Log warning si no hay emisores conectados
- [x] 5b.2 Crear `PlanificacionSseController.java` en `bc1/infrastructure/`:
  - `GET /api/eventos/planificacion` retorna `SseEmitter`
  - `@PreAuthorize("hasRole('OPERADOR_LOGISTICO')")`
- [x] 5b.3 `PlanificacionWorker` notifica via `SseService.broadcast()`:
  - Evento `planificacion-completada` en éxito (con datos del plan de viaje)
  - Evento `planificacion-fallida` en fallo (con mensaje de error)
- [x] 5b.4 Manejo de timeouts y desconexiones (onTimeout → complete, onCompletion → remove)
- [x] 5b.5 Log cuando no hay emisores conectados ("Sin emisores SSE para broadcast")

## Infraestructura

- [x] Agregar `@EnableScheduling` a `BackendApplication.java`
- [x] Agregar `.requestMatchers("/api/eventos/**").authenticated()` en `SecurityConfig.java`
