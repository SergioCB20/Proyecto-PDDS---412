# Plan de Tareas — TAS FB2B

> Proyecto de Gestión Logística de Equipaje Aéreo
> Equipo: 3 personas (2 backend, 1 frontend)
> Fecha: 10/05/2026

---

## Estado Actual (Actualizado: 12/05/2026)

| Área | Estado | Notas |
|---|---|---|
| BC1 — Entidades, Services, Controllers | **100%** | ✅ Completo: carga masiva, PDF, Redis |
| BC2 — Planifcación y Replanificación | ~40% | Migraciones, entidades, SesionService+Controller completados. Falta: MotorEnrutamiento, TickService, Redis |
| BC3 — Identidad y Acceso | **100%** | ✅ Completo: auditoría, validaciones, seed, nodo_ref_id en operadores |
| Frontend — Login, Admin, Mapa | ~75% | Simulación conectada a API real. Faltan: carga masiva UI, reporte conexión real, PDF |

---

## Tarea 0 — Events Compartidos (CRÍTICO)

**Archivos a crear (cualquier persona puede hacerlo primero):**

```
com.tasfb2b.backend.shared.events/
├── EquipajeIngresadoEvent.java    ← record: equipajeId, timestamp
├── VueloCanceladoEvent.java       ← record: vueloId, timestamp, causa
└── UbicacionActualizadaEvent.java ← record: equipajeId, lat, lon, timestamp
```

**Desbloquea:** Publicación en BC1 + Listeners en BC2

> whoever reaches this first, do it NOW to unblock the other two

---

## Persona 1 — Backend BC1 + BC3

| # | Tarea | Dep | Descripción |
|---|---|---|---|
| **0** | Crear eventos compartidos | — | ~~Crear `shared/events/` con los 3 record classes~~ ✅ Completado |
| 1 | Publicar eventos en BC1 | 0 | ~~Inyectar `ApplicationEventPublisher` en `EquipajeService` → publicar `EquipajeIngresadoEvent`~~ ✅ Completado. En `CancelacionService` → ~~publicar `VueloCanceladoEvent`~~ ✅ Completado. |
| 2 | Carga masiva CSV | — | ~~`POST /equipajes/carga-masiva` → lee CSV, valida cada fila, devuelve preview con `validos`, `con_revision`~~ ✅ Completado |
| 3 | Confirmar carga masiva | 2 | ~~`POST /equipajes/carga-masiva/confirmar` → ingresa IDs válidos~~ ✅ Completado |
| 4 | Manifiesto PDF | — | ~~`GET /manifiestos/{vuelo_id}` → genera PDF con lista de equipajes del vuelo~~ ✅ Completado |
| 5 | Integración Redis | — | ~~Escribir `nodo:{id}:ocupacion` y `vuelo:{id}:carga_disponible` al registrar/cancelar. Usar `StringRedisTemplate`.~~ ✅ Completado |
| 6 | Auditoría BC3 completa | — | ~~En `UsuarioService.crear()` y `cambiarEstado()` → guardar `EntradaAuditoria`~~ ✅ Completado. |
| 7 | Validar PUT /usuarios | — | ~~En `UsuarioService.actualizar()` → solo permitir cambio de `nombre`, rechazar cambio de `rol` o `nodo_ref_id`~~ ✅ Completado. |
| 8 | Seed plan_vuelos en SQL | — | ~~Mover el `INSERT INTO plan_vuelos` del DataSeeder a `V5__plan_vuelos.sql`~~ ✅ Completado. |

---

## Persona 2 — Backend BC2

**MotorEnrutamiento es independiente — puede empezar sin esperar eventos.**

| # | Tarea | Dep | Descripción |
|---|---|---|---|
| **0** | Crear eventos compartidos | — | ~~Crear `shared/events/` con los 3 record classes~~ ✅ Completado |
| 1 | Migraciones BC2 | — | ~~`V12__sesiones_ejecucion.sql` a `V17__puntos_sla.sql`~~ ✅ Completado |
| 2 | Entidades BC2 | 0 | ~~`SesionEjecucion`, `EventoCancelacion`, `LoteReplanificacion` + enums~~ ✅ Completado |
| 3 | Repos BC2 | 2 | ~~`SesionRepository`, `EventoCancelacionRepository`, `LoteReplanificacionRepository`~~ ✅ Completado |
| 4 | MotorEnrutamiento greedy | 2 | Algoritmo greedy: buscar vuelo directo o conexión de 2 escalas (mínimo 60 min conexión). Respeta SLA. Retorna `PlanViaje` con `SegmentoPlan[]`. Tests unitarios obligatorios. **Stateless — no deps externos.** |
| 5 | SesionService + SesionController | 4 | ~~`POST /sesiones`, `POST /sesiones/{id}/iniciar`, `/pausar`, `/detener`~~ ✅ Completado. **NOTA: /metricas devuelve datos de BD (dummy), falta integración con TickService y Redis** |
| 6 | ReplanificacionService | 4 + 0 | `@EventListener` de `VueloCanceladoEvent` → obtiene equipajes afectados, crea lote, ejecuta motor, evalúa SLA breach, actualiza estado equipaje |
| 7 | TickService | 5 | Scheduler: avanza reloj virtual, evalúa probabilidad de cancelación, actualiza estados, escribe Redis (`sesion:{id}:metricas`), registra `PuntoSLA`. **CRÍTICO para tener métricas reales en la simulación** |
| 8 | ReporteService + MetricasController | 6 | `GET /sesiones/{id}/metricas` (debe leer de Redis), `GET /sesiones/{id}/reporte` (genera reporte con serie SLA, punto colapso) |
| 9 | WebSocket teletría | 7 | Endpoint `ws://host/api/ws/telemetria?token={jwt}` → emite JSON con posiciones de nodos/vuelos cada tick |

---

## Persona 3 — Frontend

**Usa mock data inicialmente — sin dependencias del backend.**

| # | Tarea | Dep | Descripción |
|---|---|---|---|
| 1 | Página `/simulacion/[id]/reporte` | — | ~~Recharts `LineChart` con `serie_sla` (mock data). Tarjetas: SLA%, replanificadas, punto colapso. Pattern `.catch(() => MOCK_DATA)`.~~ ✅ Completado |
| 2 | Formulario registro equipaje | — | ~~En `/operacion`: `id_equipaje`, `destino_iata` (select), `vuelo_id` (select `/vuelos?estado=PROGRAMADO`), `sla_comprometido` → `POST /equipajes`~~ ✅ Completado |
| 3 | Middleware protección rutas | — | ~~`middleware.ts` → lee cookie `token`, extrae rol, protege `/admin`, `/simulacion`, `/operacion`~~ ✅ Completado |
| 4 | UI carga masiva | Backend A2 | Upload CSV → preview → confirmar. Conecta a `POST /equipajes/carga-masiva` y `confirmar` |
| 5 | Conectar simulación a API real | Backend B5 | ~~Reemplazar `tickMetricasMock` por polling `GET /sesiones/{id}/metricas`. Botones iniciar/pausar/detener a sus endpoints. `POST /sesiones` al crear.~~ ✅ Completado. **NOTA: muestra datos dummy hasta que TickService escriba en Redis** |
| 6 | Link a reporte | 1 + Backend B8 | En `/simulacion/[id]`: botón "Ver Reporte" cuando estado = FINALIZADA → redirige a `/simulacion/[id]/reporte` |
| 7 | Botón manifiesto PDF | Backend A4 | Botón descarga en `/operacion` → `GET /manifiestos/{vuelo_id}` |
| 8 | Selector nodo en Admin | — | ~~En `/admin`: selector de nodo al crear usuario OPERADOR_LOGISTICO~~ ✅ Completado (12/05/2026) |

---

## Dependencias y orden sugerido

### Semana 1 — Foundation (3 tracks paralelos)

```
Track A (Persona 1):
  Tarea 0 → Publicar eventos BC1 → Redis → Auditoría BC3
  ✅ Semana 1 completa — tareas 0, 1, 6, 7, 8 completadas
  Semanas 2-3: Carga masiva → Confirmar → Manifiesto PDF → Seed SQL

Track B (Persona 2):
  Tarea 0 → Migraciones BC2 → Entidades → MotorEnrutamiento

Track C (Persona 3):
  C1 (reporte mock) → C3 (middleware) → C2 (registro equipaje)
```

### Semana 2 — Core Services

```
Track A (Persona 1):
  Carga masiva → Confirmar → Manifiesto PDF

Track B (Persona 2):
  SesionService → ReplanificacionService → TickService

Track C (Persona 3):
  Conectar a API real de sesión → Link reporte
```

### Semana 3 — Integración y polish

```
Track A (Persona 1):
  Seed SQL → Validar PUT usuarios

Track B (Persona 2):
  ReporteService → MetricasController → WebSocket

Track C (Persona 3):
  UI carga masiva → WebSocket live map → Botón PDF
```

---

## Claves para paralelismo exitoso

1. **Tarea 0 (events):** La primera persona que llegue la crea en `shared/events/`. Las otras dos esperan o crean las suyas y se sincronizan después.

2. **MotorEnrutamiento es independiente:** Persona 2 puede empezar con la tarea B4 (Motor) sin esperar eventos. El motor no publica ni escucha eventos — solo recibe datos y retorna rutas.

3. **Frontend con mocks:** Persona 3 construye las páginas con mock data desde el día 1. La conexión a APIs reales viene después cuando el backend esté listo — el frontend ya tiene el patrón de fallback en `lib/mock.ts`.

4. **BC2 no bloquea frontend de reporte:** La página de reporte (C1) puede mostrar datos mock desde el inicio. La conexión real a `GET /sesiones/{id}/reporte` se agrega cuando B8 esté listo.

5. **Redis como interfaz:** El frontend polling `/metricas` solo lee Redis. El backend escribe Redis en B7 (TickService). Ambos pueden desarrollarse y probarse por separado.

---

## Specs de referencia

| Archivo | Para quién | Contenido |
|---|---|---|
| `openspec/specs/database-schema.md` | Personas 1 y 2 | Esquema SQL exacto de todas las tablas |
| `openspec/specs/api-contracts.md` | Personas 2 y 3 | Contratos de endpoints — la fuente de verdad |
| `openspec/specs/bc1-gestion-operativa.md` | Persona 1 | Reglas de negocio de BC1 |
| `openspec/specs/bc2-planificacion-replanificacion.md` | Persona 2 | Algoritmos y lógica de BC2 |
| `openspec/specs/frontend-structure.md` | Persona 3 | Estructura de carpetas y componentes del frontend |

---

## Estado de la Simulación (12/05/2026)

La simulación ya está conectada al backend:
- ✅ Se puede crear sesión (`POST /sesiones`)
- ✅ Se puede iniciar, pausar, detener (`POST /sesiones/{id}/iniciar|pausar|detener`)
- ✅ Polling de métricas funciona (`GET /sesiones/{id}/metricas`)
- ⚠️ **Las métricas son dummy** — muestran valores estáticos (SLA=100, cancelados=0)

**Para tener métricas reales en la simulación, falta:**
1. **TickService** (Backend B7) — scheduler que calcula y actualiza métricas
2. **Redis** — TickService debe escribir en `sesion:{id}:metricas`
3. **SesionService.obtenerMetricas()** — debe leer de Redis en lugar de BD

---

## Convenciones de commits

```bash
git checkout -b backend/bc2-sesiones
git add .
git commit -m "feat(bc2): implementar motor de enrutamiento greedy"
```

| Prefijo | Cuándo |
|---|---|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de bug |
| `chore:` | Configuración, dependencias |
| `refactor:` | Reestructuración sin cambio de comportamiento |

---

## Usuarios de prueba (ya en base de datos)

| Correo | Password | Rol | Nodo Asignado |
|---|---|---|---|
| admin@tasfb2b.com | admin123 | ADMINISTRADOR | — |
| operador@tasfb2b.com | operador123 | OPERADOR_LOGISTICO | LIM (Jorge Chavez) |
| analista@tasfb2b.com | analista123 | ANALISTA | — |

---

## Levantar ambiente local

```bash
# Backend
cd backend/backend
cp .env.example .env  # editar con credenciales locales
./mvnw spring-boot:run

# Frontend
cd frontend
npm run dev
```

Frontend: http://localhost:3000
Backend API: http://localhost:8080/api
Health: http://localhost:8080/health