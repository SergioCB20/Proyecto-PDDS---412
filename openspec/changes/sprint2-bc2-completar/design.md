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
- No se cambia el esquema de BD (migraciones V12-V17 ya existen)
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

### D4: WebSocket con Spring WebSocket (no STOMP)
**Decisión:** Usar Spring WebSocket básico con `TextWebSocketHandler` en lugar de STOMP.
**Razón:** Solo necesitamos emisión unidireccional servidor→cliente. STOMP añade complejidad innecesaria.
**Alternativa considerada:** Server-Sent Events (SSE) — rechazado porque WebSocket permite autenticación por query param más simple.

### D5: Eventos publicados por BC2
**Decisión:** BC2 publica `PlanViajeCreado`, `ReplanificacionIniciada`, `SesionFinalizada` como eventos de Spring en `shared/events/`.
**Razón:** Mantiene consistencia con el patrón existente (`EquipajeIngresadoEvent`, `VueloCanceladoEvent`).

### D6: Métricas dummy como fallback en frontend
**Decisión:** El frontend mantiene el fallback a mock data si el backend no responde a `GET /sesiones/{id}/metricas`.
**Razón:** Permite desarrollo y demo sin backend completo; se elimina en producción.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| TickService y SesionService comparten acceso a misma sesión | Usar `@Transactional` y sincronización a nivel de sesión ID |
| Redis cae durante simulación | TickService loggea error y continúa; métricas se reconstruyen desde PostgreSQL al reiniciar |
| WebSocket desconexiones | Frontend reconecta automáticamente con backoff exponencial |
| Motor greedy no encuentra ruta para equipajes lejanos | Marca como `INCUMPLIMIENTO_SLA` — comportamiento esperado, no error |
| Conflictos de merge entre Dev 1 y Dev 2 en SesionController | Dev 2 no toca SesionController; MetricasController es archivo separado |
| Probabilidad de cancelación genera demasiadas cancelaciones | Probabilidad configurable por sesión (0-100%); valor típico 0.05-0.15 |
