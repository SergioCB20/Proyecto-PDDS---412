# Sprint 2 — Tareas Pendientes TAS FB2B

> Objetivo: Completar BC2, cerrar frontend pendiente y tener simulación con datos reales
> Equipo: 3 personas (2 backend, 1 frontend)
> Duración estimada: 1 semana

---

## Tareas Pendientes

### Backend BC1 — Cola de planificación asíncrona (Dev 2)

| # | Tarea | Dep | Estado | Descripción |
|---|---|---|---|---|
| **B10** | Cola de planificación infraestructura | — | ✅ Completado | Migración `V18__cola_planificacion.sql`, entidad `ColaPlanificacion`, enums `EstadoCola`/`TipoCola`, repository con `@Lock(PESSIMISTIC_WRITE)` + query nativa `SELECT ... FOR UPDATE SKIP LOCKED`, `PlanificacionWorker` con `@Scheduled(fixedDelay = 500)` que toma items uno a la vez, timeout de items EN_PROCESO > 5 min |
| **B12** | SSE notificaciones | B10 | ✅ Completado | `SseService` con `ConcurrentHashMap<UUID, SseEmitter>`, `PlanificacionSseController` con `GET /api/eventos/planificacion`, manejo de timeouts y desconexiones. El `PlanificacionWorker` notifica vía SSE al completar/fallar items |

### Backend BC2 — Core (Dev 1)

| # | Tarea | Dep | Estado | Descripción |
|---|---|---|---|---|
| **B4** | MotorEnrutamiento greedy | — | ✅ Completado | Arquitectura desacoplada via `RoutingStrategy` (Strategy pattern). `GreedyRoutingStrategy` puro sin repos ni Spring. `MotorEnrutamiento` es orquestador que controla BD y tiempo. 8 tests unitarios del algoritmo + 3 tests de orquestación. |
| **B13** | Batch simulacion + SLA ordering | B10 | ✅ Completado | Migración V19: `sla_comprometido TIMESTAMPTZ` + índice `(estado, sla_comprometido)`. `ColaPlanificacion.slaComprometido`. `ColaPlanificacionRepository.findBatchByEstadoWithLock()` con `ORDER BY sla_comprometido ASC NULLS LAST`. `EquipajeService` setea `slaComprometido` al encolar. `PlanificacionWorker` con modo batch (inyecta `SesionRepository`, detecta sesión EN_CURSO → batch de 50 items ordenados por SLA). |
| **B14** | ACORoutingStrategy | B4 | ✅ Completado | `ACORoutingStrategy implements RoutingStrategy` con `soportaBatch() = true`. Implementa ACO v2 (feromonas, hormigas, elitismo, BFS de alcanzabilidad, SLA gradual). Adaptado a dominio actual: construye grafo en memoria desde `List<Vuelo>`, usa `TiempoInterno` para tiempo virtual. `MotorEnrutamiento` ahora inyecta ambas estrategias via `@Qualifier`: greedy para single-item, ACO para batch. |
| **B15** | TiempoInterno | B4 | ✅ Completado | Record `TiempoInterno(horaDelDia, dia)` con métodos `desde(OffsetDateTime, OffsetDateTime)` para convertir timestamps a int-based virtual time. `RoutingStrategy` modificada: `optimizarLote()` acepta `TiempoInterno`. |
| **B6** | ReplanificacionService | B4 | ⏳ Pendiente | `@EventListener(VueloCanceladoEvent)` → obtiene equipajes afectados (`findByVueloActualId`), marca `EN_REPLANIFICACION`, crea `EventoCancelacion` + `LoteReplanificacion` + `ItemLote`, **encola cada equipaje en `cola_planificacion`** con tipo=REPLANIFICACION. El worker (B10) ejecuta el motor. |
| **B11** | EquipajeService + CancelacionService asíncronos | B10 | ⏳ Pendiente | `EquipajeService.registrar()` → solo valida datos básicos, guarda Equipaje (estado=REGISTRADO), **encola en `cola_planificacion`** con tipo=PLANIFICACION, responde 202 Accepted. `CancelacionService.cancelar()` → marca vuelo CANCELADO, **encola equipajes afectados** en `cola_planificacion` en vez de procesar sync. |
| **B8** | ReporteService + MetricasController | B6 | ⏳ Pendiente | `GET /sesiones/{id}/metricas` (lee Redis), `GET /sesiones/{id}/reporte` (serie SLA, punto colapso) |

### Backend BC2 — Infraestructura (Dev 2)

| # | Tarea | Dep | Estado | Descripción |
|---|---|---|---|---|
| **B7** | TickService | B5 (✅) | ✅ Completado | Scheduler: avanza reloj virtual, evalúa probabilidad de cancelación, actualiza estados, escribe Redis (`sesion:{id}:metricas`), registra `PuntoSLA`. **CRÍTICO para métricas reales** |
| **B9** | WebSocket telemetría | B7 | ✅ Completado | Endpoint `ws://host/api/ws/telemetria?token={jwt}` → emite JSON con posiciones de nodos/vuelos cada tick |

### Frontend (Dev 3)

| # | Tarea | Dep | Estado | Descripción |
|---|---|---|---|---|
| **C4** | UI carga masiva | A2 (✅) | ✅ Completado | Upload CSV → preview → confirmar. Conecta a `POST /equipajes/carga-masiva` y `confirmar` |
| **C7** | Botón manifiesto PDF | A4 (✅) | ✅ Completado | Botón descarga en `/operacion` → `GET /manifiestos/{vuelo_id}` |
| **C8** | Integración SSE en operación | B12 | ✅ Completado | `EventSource` con token query param, eventos `planificacion-completada`/`planificacion-fallida`, notificaciones toast, reconexión automática 3s. Backend modificado para aceptar `?token=`. |
| **C6** | Link a reporte | B8 | ✅ Completado | Botón "Ver Reporte" cuando estado = FINALIZADA → redirige a `/simulacion/[id]/reporte` con fallback a mock data |

---

## Plan de Ejecución Paralela

### Fase 1 — Inicio paralelo (Día 1-2)

**Dev 1 y Dev 2 trabajan en paralelo. Dev 3 salta directo a C7:**

```
Dev 1 (Backend Core):          Dev 2 (Backend Infra + Cola):  Dev 3 (Frontend):
┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│ B4: MotorEnrutamiento│       │ ✅ B10: Cola Infra   │       │ C7: Botón PDF        │
│ - Stateless          │       │ - V18 migración      │       │ - GET manifiesto PDF │
│ - Sin deps externas  │       │ - ColaPlanificacion  │       │ - Ya hay API lista   │
│ - Tests unitarios    │       │ - SKIP LOCKED repo   │       │                      │
└──────────────────────┘       │ - Worker @Scheduled  │       └──────────────────────┘
                                │ - Timeout items      │
                                └──────────────────────┘
```

**Por qué no se pisan:**
- B4 es stateless y puro (solo recibe datos, retorna rutas)
- ✅ B10 es BC1 infraestructura nueva (no toca archivos de BC2)
- C7 consume endpoint de BC1 (ya listo)
- **Cero solapamiento de archivos**

### Fase 2 — Continuación paralela (Día 3-4)

```
Dev 1 (Backend Core):          Dev 2 (Backend Infra + Cola):  Dev 3 (Frontend):
┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│ B6: Replanificacion  │       │ B7: TickService      │       │ C8: SSE integración  │
│ - Escucha eventos    │       │ - Scheduler virtual  │       │ - EventSource        │
│ - Usa Motor (B4)     │       │ - Escribe Redis      │       │ - planificacion-     │
│ - Encola en cola     │       │ - Prob. cancelación  │       │   completada/fallida │
└──────────────────────┘       └──────────────────────┘       └──────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐
│ B11: EqService async │       │ B9: WebSocket        │
│ - Registrar → encola │       │ - Telemetría live    │
│ - Cancelar → encola  │       │ - Depende de B7      │
│ - 202 Accepted       │       │ - Emite posiciones   │
└──────────────────────┘       └──────────────────────┘
                               ┌──────────────────────────┐
                               │ ✅ B12: SSE notificar    │
                               │ - SseService             │
                               │ - SseController          │
                               │ - Worker → SSE           │
                               └──────────────────────────┘
```

**Notas:**
- B6 necesita B4 terminado (usa el motor)
- B11 necesita ✅ B10 terminado (usa la cola)
- B7, B9 independientes de cola
- ✅ B12 depende de B10 (SSE recibe eventos del worker)
- C8 depende de ✅ B12
- **Posible solapamiento B6/B11 en CancelacionService** — coordinar entre Dev 1 y Dev 2

### Fase 3 — Cierre (Día 5)

```
Dev 1 (Backend Core):          Dev 2 (Backend Infra):        Dev 3 (Frontend):
┌──────────────────────┐       ┌──────────────────────┐      ┌──────────────────────┐
│ B8: ReporteService   │       │ - Apoyo a B8 si      │      │ C6: Link a reporte   │
│ - Lee Redis          │       │   necesita           │      │ - Depende de B8      │
│ - Genera reporte     │       │                      │      │ - Botón FINALIZADA   │
│ - Métricas reales    │       │                      │      │ - Redirige reporte   │
└──────────────────────┘       └──────────────────────┘      └──────────────────────┘
```

**Notas:**
- B8 necesita B6 terminado (reporte usa datos de replanificación)
- C6 se desbloquea cuando B8 está listo
- C8 debería estar listo en Fase 2 (depende de B12)
- Dev 2 puede apoyar a Dev 1 en B8 si termina B7/B9/B12 antes

---

## Diagrama de Dependencias

```
B10 (Cola infra) ──→ B11 (EqService async) ──→ Frontend (vía SSE)
   │
   ├──→ B12 (SSE notificaciones) ──→ C8 (SSE frontend)
   │
   └──→ B6 (Replanificacion encola) ──→ B8 (Reporte) ──→ C6 (Link reporte)
                                            ↑
B4 (Motor) ──────────────────→ B6 ─────────┘
B5 (✅ Sesion) ──→ B7 (TickService) ──→ B9 (WebSocket)

A2 (✅ Carga) ──→ C4 (✅ UI carga masiva)
A4 (✅ PDF)   ──→ C7 (Botón PDF)
```

---

## Reglas para no pisarse

1. **Branches separados:** Cada dev usa su rama:
   - `sprint2/bc2-motor-replanificacion` (Dev 1)
   - `sprint2/bc2-tick-websocket` (Dev 2)
   - `sprint2/frontend-pdf-reporte` (Dev 3)

2. **Archivos que toca cada uno:**

   | Dev | Archivos |
   |---|---|
   | Dev 1 | `bc2/domain/ItemLote.java` (nuevo), `bc2/domain/ReporteSesion.java` (nuevo), `bc2/domain/PuntoSLA.java` (nuevo), `bc2/domain/EstadoReplanificacion.java` (nuevo), `bc2/infrastructure/ItemLoteRepository.java` (nuevo), `bc2/infrastructure/ReporteSesionRepository.java` (nuevo), `bc2/infrastructure/PuntoSLARepository.java` (nuevo), `shared/events/ReplanificacionIniciada.java` (nuevo), `shared/events/SesionFinalizada.java` (nuevo), `bc2/application/ReplanificacionService.java` (nuevo), `bc2/application/ReporteService.java` (nuevo), `bc2/infrastructure/MetricasController.java` (nuevo), `bc2/application/MotorEnrutamiento.java` (✅ existente), `bc1/application/EquipajeService.java` (mod — async), `bc1/application/CancelacionService.java` (mod — async), `bc2/application/SesionService.java` (mod — publica eventos), `bc2/application/TickService.java` (mod — delega en ReplanificacionService), `bc1/infrastructure/EquipajeController.java` (mod — 202 Accepted) |
   | Dev 2 | `bc1/domain/ColaPlanificacion.java`, `bc1/domain/EstadoCola.java`, `bc1/domain/TipoCola.java`, `bc1/infrastructure/ColaPlanificacionRepository.java`, `bc1/application/PlanificacionWorker.java`, `V18__cola_planificacion.sql`, `shared/infrastructure/SseService.java`, `bc1/infrastructure/PlanificacionSseController.java`, `bc2/application/MotorEnrutamiento.java`, `shared/events/EquipajePlanificadoEvent.java`, `shared/events/PlanViajeCreado.java`, `bc2/application/TickService.java` (ya no toca), `bc2/infrastructure/WebSocketConfig.java`, `bc2/infrastructure/TelemetriaWebSocket.java` |
   | Dev 3 | `app/operacion/page.tsx`, `app/simulacion/[id]/page.tsx` |

3. **Comunicación de interfaces:**
   - Dev 1 y Dev 2 deben acordar el formato de `sesion:{id}:metricas` en Redis antes de empezar B7/B8
   - Dev 3 debe confirmar con Dev 1 el contrato de `GET /sesiones/{id}/reporte` antes de hacer C6
   - Dev 1 y Dev 2 coordinar `CancelacionService` (lo tocan ambos: Dev 1 para BC2 events, Dev 2 para B11)
   - Acordar el contrato SSE (`planificacion-completada`, `planificacion-fallida`) entre Dev 2 y Dev 3

4. **Merge顺序:**
   - ✅ Primero merge de Dev 2 (B10 ✅, B7, B9, B12 ✅) — archivos nuevos BC1 + BC2 infra
   - Luego merge de Dev 1 (B4, B6, B8, B11) — B11 modifica BC1 services, posible conflicto con B10 si no se separaron bien
   - Último merge de Dev 3 (C7, C8, C6) — solo frontend, sin conflicto con backend

---

## Checklist de Integración Final

- [x] B4: MotorEnrutamiento con tests unitarios pasando (6 tests: directo, conexión 2 tramos, sin ruta, capacidad, SLA violado, destino no encontrado)
- [x] B10: ColaPlanificacion entity + repository + migración V18
- [x] B10: PlanificacionWorker procesa items con SKIP LOCKED
- [x] B11: EquipajeService.registrar() encola y responde 202 (async con cola_planificacion)
- [x] B11: CancelacionService.cancelar() publica VueloCanceladoEvent → ReplanificacionService encola
- [x] B6: ReplanificacionService escucha eventos y encola en cola_planificacion (EventListener + replanificarEnSesion directo)
- [x] B12: SSE notifica planificacion-completada/fallida al frontend
- [x] B7: TickService escribe métricas reales en Redis (refactorizado: delega cancelaciones a ReplanificacionService)
- [x] B8: ReporteService + MetricasController (GET /sesiones/{id}/reporte con serie SLA)
- [x] B9: WebSocket emite telemetría en vivo
- [x] C4: UI carga masiva funcional con API real
- [x] C7: Botón descarga PDF funcional
- [x] C8: Frontend recibe SSE y actualiza mapa en tiempo real
- [x] C6: Link a reporte aparece cuando sesión = FINALIZADA
- [ ] Simulación muestra métricas reales (no dummy)
- [x] Items EN_PROCESO > 5 min se marcan FALLIDO (timeout)
- [x] Todos los endpoints documentados en `openspec/specs/api-contracts.md`

---

## Specs de referencia

| Archivo | Para quién |
|---|---|
| `openspec/specs/bc2-planificacion-replanificacion.md` | Dev 1, Dev 2 |
| `openspec/specs/api-contracts.md` | Dev 1, Dev 2, Dev 3 |
| `openspec/specs/frontend-structure.md` | Dev 3 |
| `openspec/specs/database-schema.md` | Dev 1, Dev 2 |
