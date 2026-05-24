## Why

BC2 (Planificación y Replanificación) es el core intelectual del sistema TAS FB2B y actualmente está al ~30% de implementación. Sin el motor de enrutamiento, el tick de simulación, la replanificación por eventos y los reportes con métricas reales, la simulación no funciona — las métricas son dummy y no hay telemetría en vivo. Este sprint completa BC2 y cierra el frontend pendiente para tener un sistema funcional de extremo a extremo.

## What Changes

- **Cola de planificación asíncrona** (`ColaPlanificacion` + `PlanificacionWorker`): tabla en PostgreSQL con estados PENDIENTE/EN_PROCESO/COMPLETADO/FALLIDO. Worker background usa `SELECT ... FOR UPDATE SKIP LOCKED` para tomar un item a la vez, eliminando race conditions en el read-modify-write de `cargaDisponible` y `ocupacionActual`.
- **Motor de enrutamiento greedy** (`MotorEnrutamiento`): algoritmo stateless que calcula rutas directas o de 2 escalas (mín 60 min conexión), respeta SLA y capacidad de vuelos. Es llamado por `PlanificacionWorker` (BC1) y por `ReplanificacionService` (BC2) durante simulación.
- **Replanificación por eventos** (`ReplanificacionService`): escucha `VueloCanceladoEvent`, identifica equipajes afectados, crea lote, **encola items en `cola_planificacion`** en vez de procesar sincrónicamente. El `PlanificacionWorker` ejecuta `MotorEnrutamiento` y persiste los resultados.
- **SSE de notificaciones** (`PlanificacionSseController`): `GET /api/eventos/planificacion` emite eventos `planificacion-completada` y `planificacion-fallida` al frontend cuando el worker procesa items.
- **Tick de simulación** (`TickService`): scheduler que avanza reloj virtual, evalúa probabilidad de cancelación, actualiza estados de equipajes/vuelos, escribe métricas en Redis, registra `PuntoSLA`.
- **Reportes y métricas reales** (`ReporteService` + `MetricasController`): `GET /sesiones/{id}/metricas` lee Redis, `GET /sesiones/{id}/reporte` genera reporte con serie SLA y punto de colapso.
- **WebSocket de telemetría** (`TelemetriaWebSocket`): endpoint `ws://host/api/ws/telemetria?token={jwt}` emite posiciones de nodos/vuelos cada tick.
- **Frontend C7**: botón de descarga de manifiesto PDF en `/operacion`.
- **Frontend C6**: link a reporte en `/simulacion/[id]` cuando sesión = FINALIZADA.
- **Entidades faltantes**: `ItemLote`, `ReporteSesion`, `PuntoSLA` (tablas ya existen en BD, faltan JPA entities y repositorios).
- **Eventos publicados**: `PlanViajeCreado`, `ReplanificacionIniciada`, `SesionFinalizada`.

## Capabilities

### New Capabilities
- `motor-enrutamiento`: Algoritmo greedy de ruteo de equipajes con soporte de vuelos directos y conexiones de 2 escalas, respeto de SLA y capacidad.
- `replanificacion-eventos`: Replanificación automática basada en eventos de cancelación de vuelos con gestión de lotes y evaluación SLA.
- `tick-simulacion`: Reloj virtual de simulación con avance de tiempo, cancelaciones probabilísticas, actualización de métricas en Redis y registro de puntos SLA.
- `reporte-sesion`: Generación de reportes finales de sesión con serie temporal SLA, detección de colapso y métricas consolidadas.
- `websocket-telemetria`: Endpoint WebSocket para emisión en tiempo real de posiciones de nodos y vuelos durante simulación.
- `metricas-reales`: Métricas de sesión leídas desde Redis (no dummy) con polling HTTP y fallback a mock.

### Modified Capabilities
- `bc2-planificacion-replanificacion`: Se completan las entidades faltantes (ItemLote, ReporteSesion, PuntoSLA), repositorios, y se agrega la integración completa con eventos de BC1.
- `api-contracts`: Se agregan endpoints `GET /sesiones/{id}/reporte` y WebSocket `ws://api/ws/telemetria` que no estaban implementados.
- `frontend-structure`: Se agrega botón PDF en `/operacion` (C7) y link a reporte condicional en `/simulacion/[id]` (C6).

## Impact

- **Backend BC1**: ~5 archivos nuevos (`ColaPlanificacion`, `EstadoCola`, `TipoCola`, `ColaPlanificacionRepository`, `PlanificacionWorker`, `SseService`, `PlanificacionSseController`), ~2 modificados (`EquipajeService.registrar()` ahora encola en vez de procesar sync, `CancelacionService.cancelar()` encola items afectados).
- **Backend BC2**: ~8 archivos nuevos (services, entities, repos, controller, websocket config), ~2 modificados (`ReplanificacionService` encola en vez de procesar sync, `SesionService`).
- **Backend shared**: 3 nuevos eventos publicados (`PlanViajeCreado`, `ReplanificacionIniciada`, `SesionFinalizada`), 1 nuevo servicio SSE (`SseService`).
- **Frontend**: 2 páginas modificadas (`operacion/page.tsx`, `simulacion/[id]/page.tsx`), posiblemente 1 nueva (`useTelemetria` hook), más integración SSE en `app/operacion/page.tsx` para escuchar `planificacion-completada`.
- **Redis**: Nuevas claves escritas por BC2 (`sesion:{id}:metricas`, `sesion:{id}:estado`).
- **Base de datos**: Nueva migración `V18__cola_planificacion.sql` con tabla `cola_planificacion`.
- **Dependencias**: `spring-boot-starter-websocket` nuevo en backend. No se requieren nuevas dependencias para la cola (usa PostgreSQL nativo).
