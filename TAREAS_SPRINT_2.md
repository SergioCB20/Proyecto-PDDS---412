# Sprint 2 — Tareas Pendientes TAS FB2B

> Objetivo: Completar BC2, cerrar frontend pendiente y tener simulación con datos reales
> Equipo: 3 personas (2 backend, 1 frontend)
> Duración estimada: 1 semana

---

## Tareas Pendientes

### Backend BC2 — Core (Dev 1)

| # | Tarea | Dep | Estado | Descripción |
|---|---|---|---|---|
| **B4** | MotorEnrutamiento greedy | — | ⏳ Pendiente | Algoritmo greedy: vuelo directo o conexión de 2 escalas (mín 60 min conexión). Respeta SLA. Retorna `PlanViaje` con `SegmentoPlan[]`. **Tests unitarios obligatorios**. Stateless — sin deps externas. |
| **B6** | ReplanificacionService | B4 | ⏳ Pendiente | `@EventListener(VueloCanceladoEvent)` → obtiene equipajes afectados, crea lote, ejecuta motor, evalúa SLA breach, actualiza estado equipaje |
| **B8** | ReporteService + MetricasController | B6 | ⏳ Pendiente | `GET /sesiones/{id}/metricas` (lee Redis), `GET /sesiones/{id}/reporte` (serie SLA, punto colapso) |

### Backend BC2 — Infraestructura (Dev 2)

| # | Tarea | Dep | Estado | Descripción |
|---|---|---|---|---|
| **B7** | TickService | B5 (✅) | ⏳ Pendiente | Scheduler: avanza reloj virtual, evalúa probabilidad de cancelación, actualiza estados, escribe Redis (`sesion:{id}:metricas`), registra `PuntoSLA`. **CRÍTICO para métricas reales** |
| **B9** | WebSocket telemetría | B7 | ⏳ Pendiente | Endpoint `ws://host/api/ws/telemetria?token={jwt}` → emite JSON con posiciones de nodos/vuelos cada tick |

### Frontend (Dev 3)

| # | Tarea | Dep | Estado | Descripción |
|---|---|---|---|---|
| **C4** | UI carga masiva | A2 (✅) | ✅ Completado | Upload CSV → preview → confirmar. Conecta a `POST /equipajes/carga-masiva` y `confirmar` |
| **C7** | Botón manifiesto PDF | A4 (✅) | ⏳ Pendiente | Botón descarga en `/operacion` → `GET /manifiestos/{vuelo_id}` |
| **C6** | Link a reporte | B8 | ⏳ Pendiente | En `/simulacion/[id]`: botón "Ver Reporte" cuando estado = FINALIZADA → redirige a `/simulacion/[id]/reporte` |

---

## Plan de Ejecución Paralela

### Fase 1 — Inicio paralelo (Día 1-2)

**Dev 1 y Dev 2 trabajan en paralelo. Dev 3 salta directo a C7:**

```
Dev 1 (Backend Core):          Dev 2 (Backend Infra):        Dev 3 (Frontend):
┌──────────────────────┐       ┌──────────────────────┐      ┌──────────────────────┐
│ B4: MotorEnrutamiento│       │ B7: TickService      │      │ C7: Botón PDF        │
│ - Stateless          │       │ - Scheduler virtual  │      │ - GET manifiesto PDF │
│ - Sin deps externas  │       │ - Escribe Redis      │      │ - Ya hay API lista   │
│ - Tests unitarios    │       │ - Prob. cancelación  │      │                      │
└──────────────────────┘       └──────────────────────┘      └──────────────────────┘
```

**Por qué no se pisan:**
- B4 es stateless y puro (solo recibe datos, retorna rutas)
- B7 depende de SesionService (ya listo) y escribe en Redis
- C7 consume endpoint de BC1 (ya listo)
- **Cero solapamiento de archivos**

### Fase 2 — Continuación paralela (Día 3-4)

```
Dev 1 (Backend Core):          Dev 2 (Backend Infra):        Dev 3 (Frontend):
┌──────────────────────┐       ┌──────────────────────┐      ┌──────────────────────┐
│ B6: Replanificacion  │       │ B9: WebSocket        │      │ C6: Espera B8        │
│ - Escucha eventos    │       │ - Telemetría live    │      │ (bloqueado)          │
│ - Usa Motor (B4)     │       │ - Depende de B7      │      │ - Prepara UI         │
│ - Crea lotes         │       │ - Emite posiciones   │      │   mientras espera    │
└──────────────────────┘       └──────────────────────┘      └──────────────────────┘
```

**Notas:**
- B6 necesita B4 terminado (usa el motor)
- B9 necesita B7 terminado (usa tick/métricas)
- C6 está bloqueado hasta que B8 esté listo

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
- Dev 2 puede apoyar a Dev 1 en B8 si termina B9 antes

---

## Diagrama de Dependencias

```
B4 (Motor) ──────→ B6 (Replanificacion) ──────→ B8 (Reporte) ──────→ C6 (Link reporte)
                                                  ↑
B5 (✅ Sesion) ──→ B7 (TickService) ──────→ B9 (WebSocket)

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
   | Dev 1 | `bc2/service/MotorEnrutamiento.java`, `ReplanificacionService.java`, `ReporteService.java`, `MetricasController.java` |
   | Dev 2 | `bc2/service/TickService.java`, `config/WebSocketConfig.java`, `controller/TelemetriaWebSocket.java` |
   | Dev 3 | `app/operacion/page.tsx`, `app/simulacion/[id]/page.tsx` |

3. **Comunicación de interfaces:**
   - Dev 1 y Dev 2 deben acordar el formato de `sesion:{id}:metricas` en Redis antes de empezar B7/B8
   - Dev 3 debe confirmar con Dev 1 el contrato de `GET /sesiones/{id}/reporte` antes de hacer C6

4. **Merge顺序:**
   - Primero merge de Dev 2 (B7, B9) — no conflictivo con Dev 1
   - Luego merge de Dev 1 (B4, B6, B8) — puede haber conflicto menor con B7 si tocan mismo controller
   - Último merge de Dev 3 (C7, C6) — solo frontend, sin conflicto con backend

---

## Checklist de Integración Final

- [ ] B4: MotorEnrutamiento con tests unitarios pasando
- [ ] B6: ReplanificacionService escucha eventos y replanifica
- [ ] B7: TickService escribe métricas reales en Redis
- [ ] B8: Métricas y reporte leen de Redis (no dummy)
- [ ] B9: WebSocket emite telemetría en vivo
- [x] C4: UI carga masiva funcional con API real
- [ ] C7: Botón descarga PDF funcional
- [ ] C6: Link a reporte aparece cuando sesión = FINALIZADA
- [ ] Simulación muestra métricas reales (no dummy)
- [ ] Todos los endpoints documentados en `openspec/specs/api-contracts.md`

---

## Specs de referencia

| Archivo | Para quién |
|---|---|
| `openspec/specs/bc2-planificacion-replanificacion.md` | Dev 1, Dev 2 |
| `openspec/specs/api-contracts.md` | Dev 1, Dev 2, Dev 3 |
| `openspec/specs/frontend-structure.md` | Dev 3 |
| `openspec/specs/database-schema.md` | Dev 1, Dev 2 |
