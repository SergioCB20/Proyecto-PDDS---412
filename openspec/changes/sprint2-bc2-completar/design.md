## Context

BC2 (Planificación y Replanificación) es el bounded context responsable de la inteligencia logística del sistema TAS FB2B. Actualmente tiene implementada solo la gestión básica de sesiones (crear, iniciar, pausar, detener) con métricas dummy. El resto del contexto — motor de enrutamiento, tick de simulación, replanificación por eventos, reportes y telemetría WebSocket — está pendiente.

**Estado actual (~30% implementado):**
- Entidades: `SesionEjecucion`, `EventoCancelacion`, `LoteReplanificacion` (3 de 6)
- Servicios: `SesionService` con métricas dummy (1 de 5)
- Repositorios: 3 de 6
- Controllers: `SesionController` (1 de 2)
- Migraciones Flyway: V12-V17 completas (tablas existen)
- Redis: configurado pero BC2 no lo usa
- WebSocket: no existe

**Restricciones:**
- BC2 se comunica con BC1 solo vía eventos de Spring (`ApplicationEventPublisher`)
- Redis es caché de lectura rápida; PostgreSQL es fuente de verdad
- Sesiones SIMULADAS no afectan estado real de vuelos/equipajes
- Solo una sesión EN_VIVO activa a la vez; múltiples SIMULADAS en paralelo

## Goals / Non-Goals

**Goals:**
- Motor de enrutamiento greedy stateless con tests unitarios
- TickService con reloj virtual que escribe métricas reales en Redis
- ReplanificacionService que escucha `VueloCanceladoEvent` y replanifica equipajes
- ReporteService con métricas reales (no dummy) y serie SLA
- WebSocket de telemetría para emisión en vivo de posiciones
- Frontend: botón PDF manifiesto + link a reporte condicional

**Non-Goals:**
- No se cambia el esquema de BD existente (migraciones V12-V17); V18__cola_planificacion es nueva
- No se implementa Redis como fuente de verdad (solo caché)
- No se cambia la autenticación JWT existente
- No se implementa enrutamiento con más de 2 escalas
- No se implementa optimización global (solo greedy)

## Decisions

### D1: MotorEnrutamiento como Domain Service stateless
**Decisión:** `MotorEnrutamiento` es un `@Service` sin estado que recibe datos y retorna `PlanViaje`. No escribe en BD.
**Razón:** Facilita testing unitario, permite reutilización en replanificación y registro individual. Sin efectos secundarios.
**Alternativa considerada:** Integrar el motor dentro de `ReplanificacionService` — rechazado porque acopla cálculo con persistencia.

### D2: TickService con `@Scheduled` de Spring
**Decisión:** Usar `@Scheduled(fixedRate = 5000)` para ticks cada 5 segundos reales.
**Razón:** Simple, nativo de Spring, suficiente para simulación académica.
**Alternativa considerada:** Quartz scheduler — rechazado por complejidad innecesaria.

### D3: Métricas en Redis como JSON string
**Decisión:** `sesion:{id}:metricas` almacena un JSON string completo (no Redis Hash).
**Razón:** Simplifica lectura/escritura; el JSON se serializa/deserializa con Jackson ya presente en Spring Boot.
**Alternativa considerada:** Redis Hash con campos individuales — rechazado porque complica atomicidad del snapshot.

### D4: WebSocket con Spring WebSocket (no STOMP) para telemetría de simulación
**Decisión:** Usar Spring WebSocket básico con `TextWebSocketHandler` en lugar de STOMP.
**Razón:** Solo necesitamos emisión unidireccional servidor→cliente. STOMP añade complejidad innecesaria.
**Alternativa considerada:** Server-Sent Events (SSE) — rechazado para telemetría porque WebSocket permite autenticación por query param más simple. SSE se utiliza por separado para notificaciones operativas de la cola de planificación (ver D8).

### D5: Eventos publicados por BC2
**Decisión:** BC2 publica `PlanViajeCreado`, `ReplanificacionIniciada`, `SesionFinalizada` como eventos de Spring en `shared/events/`.
**Razón:** Mantiene consistencia con el patrón existente (`EquipajeIngresadoEvent`, `VueloCanceladoEvent`).

### D6: Métricas dummy como fallback en frontend
**Decisión:** El frontend mantiene el fallback a mock data si el backend no responde a `GET /sesiones/{id}/metricas`.
**Razón:** Permite desarrollo y demo sin backend completo; se elimina en producción.

### D7: Cola de planificación con SKIP LOCKED para procesamiento asíncrono
**Decisión:** Crear tabla `cola_planificacion` en PostgreSQL con estados PENDIENTE/EN_PROCESO/COMPLETADO/FALLIDO. El `PlanificacionWorker` usa `SELECT ... FOR UPDATE SKIP LOCKED` para tomar un item a la vez.
**Razón:** Elimina race conditions en read-modify-write de `cargaDisponible` y `ocupacionActual`. El procesamiento secuencial garantiza que cada item vea el estado más reciente. Es transaccional — si el worker crashea, la transacción se revierte y el item sigue PENDIENTE (con timeout de 5 min para items EN_PROCESO).
**Alternativa considerada:** Redis queue — rechazada porque SKIP LOCKED es transaccional con PostgreSQL y no requiere infraestructura extra. Bloqueo en memoria con `synchronized` — rechazado porque no escala a múltiples instancias.

### D8: SSE para notificaciones operativas (cola de planificación)
**Decisión:** Usar Server-Sent Events (SSE) en `GET /api/eventos/planificacion` para notificar al frontend cuando un item de planificación se completa o falla.
**Razón:** Comunicación unidireccional simple servidor→cliente. El frontend de operación se suscribe al cargar la página y recibe actualizaciones del plan de viaje sin polling. WebSocket se reserva exclusivamente para telemetría de simulación (BC2).
**Alternativa considerada:** WebSocket unificado — rechazado porque mezcla dos canales distintos (operación vs simulación) con diferentes requisitos de autenticación y frecuencia.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| TickService y SesionService comparten acceso a misma sesión | Usar `@Transactional` y sincronización a nivel de sesión ID |
| Redis cae durante simulación | TickService loggea error y continúa; métricas se reconstruyen desde PostgreSQL al reiniciar |
| WebSocket desconexiones | Frontend reconecta automáticamente con backoff exponencial |
| Motor greedy no encuentra ruta para equipajes lejanos | Marca como `INCUMPLIMIENTO_SLA` — comportamiento esperado, no error |
| Conflictos de merge entre Dev 1 y Dev 2 en SesionController | Dev 2 no toca SesionController; MetricasController es archivo separado |
| Probabilidad de cancelación genera demasiadas cancelaciones | Probabilidad configurable por sesión (0-100%); valor típico 0.05-0.15 |
| Item EN_PROCESO huérfano tras crash del worker | Worker marca como FALLIDO items EN_PROCESO con > 5 min de antigüedad. Timeout configurable en application.properties |
| Worker no arranca o se detiene | Worker se inicia con `@PostConstruct` + `@Scheduled` en la misma app Spring Boot. Log warning si no hay items. Monitoreo vía health check |
| SSE emitter consume memoria si no se limpia | `SseService` usa `ConcurrentHashMap` y registra callbacks de `onCompletion`/`onTimeout` para limpiar emisores desconectados |
| Latencia entre registro y planificación visible | El worker procesa cada 500ms; el frontend ve el resultado vía SSE en <1s. Tiempo aceptable para uso operativo |
