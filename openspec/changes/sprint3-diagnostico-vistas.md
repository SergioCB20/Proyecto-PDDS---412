# Sprint 3 - Diagnostico Vistas Simulacion y Operacion

> Objetivo: Diagnosticar y corregir bugs para que las vistas de Simulacion y Operacion dia a dia funcionen correctamente con datos reales del backend
> Equipo: 3 personas (2 backend, 1 frontend)
> Duracion estimada: 1 semana

---

## Tareas Pendientes

### Frontend - Bugs criticos

| # | Tarea | Dev | Dep | Estado | Descripcion |
|---|---|---|---|---|---|
| **C1** | DELETE /equipajes/{id} - Type mismatch | Dev 3 | B1 | rojo Pendiente | `operacion/page.tsx:267` envia `idExterno` string pero `EquipajeController.java:88` espera `@PathVariable UUID id`. **Siempre falla con error 400.** Coordinar con Dev 2. Solucion: cambiar frontend para usar UUID interno |
| **C2** | ID de sesion inconsistente en URL | Dev 3 | - | rojo Pendiente | `simulacion/page.tsx:33` genera ID random para la URL. `simulacion/[id]/page.tsx:40` nunca lee `params.id`. Solucion: leer `params.id` de la URL, crear sesion via `POST /sesiones` al entrar si no hay `backendSesionId` |

### Frontend - Bugs moderados

| # | Tarea | Dev | Dep | Estado | Descripcion |
|---|---|---|---|---|---|
| **C3** | Duplicacion WebSocket + polling en simulacion | Dev 3 | C2 | amarillo Pendiente | `simulacion/[id]/page.tsx` activa dos fuentes: WebSocket y polling REST cada 3s. Solucion: priorizar WS cuando `connected == true`, polling como fallback |
| **C4** | Cast inseguro estado de vuelo | Dev 3 | - | amarillo Pendiente | `simulacion/[id]/page.tsx:80`: castea string forzosamente. Solucion: funcion matcher con validacion runtime |

### Frontend - Mejoras

| # | Tarea | Dev | Dep | Estado | Descripcion |
|---|---|---|---|---|---|
| **C6** | Middleware de proteccion de rutas | Dev 3 | - | verde Pendiente | `middleware.ts` no existe. Crear segun `frontend-structure.md` |
| **C7** | Timeout en api.ts | Dev 3 | - | verde Pendiente | `api.ts:7`: fetch sin `AbortController`. Agregar timeout de 15s |
| **C8** | Mapa operacion sin posicion real de vuelos | Dev 3 | - | verde Pendiente | `operacion/page.tsx` pasa `Vuelo[]` pero `GeoMapa` espera `VueloEnMapa[]`. Agregar mapeo |
| **C9** | Reporte sin Suspense boundary | Dev 3 | - | verde Pendiente | `simulacion/[id]/reporte/page.tsx` sin Suspense. Envolver en `<Suspense>` |

### Backend BC1 - Operacion (Dev 2)

| # | Tarea | Dev | Dep | Estado | Descripcion |
|---|---|---|---|---|---|
| **B1** | Fix DELETE /equipajes/{id} para aceptar idExterno | Dev 2 | - | rojo Pendiente | `EquipajeController.java:88`: cambiar `@PathVariable UUID id` a `@PathVariable String idExterno`. Service busca por `idExterno`. Coordinar con Dev 3 |
| **B2** | Decidir rol SSE y alinear seguridad | Dev 2 | - | amarillo Pendiente | Mover validacion de rol de `PlanificacionSseController` a `SecurityConfig`. Alinear `api-contracts.md` |

### Backend BC2 - Simulacion (Dev 1)

| # | Tarea | Dev | Dep | Estado | Descripcion |
|---|---|---|---|---|---|
| **B3** | Implementar evaluarColor (postergada S2) | Dev 1 | - | amarillo Pendiente | Tarea 3.7: metodo `evaluarColor(double, UmbralCapacidad)` en TelemetriaService |
| **B4** | Implementar registro PuntoSLA cada hora virtual | Dev 1 | - | amarillo Pendiente | Tarea 5.9: `TickService` registrar `PuntoSLA` en BD cada hora virtual |
| **B5** | Probar GET /sesiones/{id}/reporte con sesion real | Dev 1 | B4 | amarillo Pendiente | Tarea 12.8: verificar reporte con datos reales de simulacion |

### Infraestructura (Compartido)

| # | Tarea | Dev | Dep | Estado | Descripcion |
|---|---|---|---|---|---|
| **I1** | Ejecutar mvn test en backend | Dev 1 | B3-B5 | amarillo Pendiente | Todos los tests deben pasar |
| **I2** | Ejecutar npm run build en frontend | Dev 3 | C1-C9 | verde Pendiente | Sin errores de compilacion |
| **I3** | Actualizar api-contracts.md | Dev 2 | B2 | verde Pendiente | Reflejar cambios de roles y endpoints |

---

## Plan de Ejecucion Paralela

### Fase 1 - Bugs criticos (Dia 1-2)

Dev 1 arranca independiente. Dev 2 y Dev 3 trabajan en paralelo en C1/B1:

```
Dev 1 (BC2 Core):          Dev 2 (BC1 + Seguridad):   Dev 3 (Frontend):
+--------------------------+ +--------------------------+ +--------------------------+
| B3: evaluarColor        | | B1: Fix DELETE equipaje | | C2: Sesion ID en URL    |
| - TelemetriaService     | | - EquipajeController    | | - params.id real       |
| - Sin deps externas    | | - EquipajeService       | | - POST /sesiones       |
+--------------------------+ | - Buscar por idExterno  | |   al entrar            |
                              +--------------------------+ +--------------------------+
```

Por que no se pisan:
- B3 es BC2 puro, no toca archivos de Dev 2
- B1 es BC1, no toca archivos de Dev 1
- C2 es frontend puro
- C1 depende de B1: coordinar contrato entre Dev 2 y Dev 3

### Fase 2 - Bugs moderados + Backend (Dia 3-4)

```
Dev 1 (BC2 Core):          Dev 2 (BC1 + Seguridad):   Dev 3 (Frontend):
+--------------------------+ +--------------------------+ +--------------------------+
| B4: PuntoSLA en Tick   | | B2: Rol SSE alinear    | | C3: WS+Polling fix     |
| - TickService.java      | | - PlanificacionSse      | | C4: Cast inseguro      |
| - PuntoSLA domain       | |   Controller            | | C6: Middleware         |
| - Quitar FK o pre-crear | | - SecurityConfig        | | C7: Timeout api.ts    |
+--------------------------+ | - api-contracts.md      | +--------------------------+
                              +--------------------------+
```

Notas:
- B4 independiente de Dev 2 y Dev 3 (solo BC2)
- B2 solo toca SecurityConfig y spec
- Dev 3 puede tomar C6, C7 en paralelo

### Fase 3 - Cierre + Mejoras (Dia 5)

```
Dev 1 (BC2 Core):          Dev 2 (BC1 + Seguridad):   Dev 3 (Frontend):
+--------------------------+ +--------------------------+ +--------------------------+
| B5: Probar reporte     | | I3: api-contracts.md   | | C8: Mapa posiciones   |
| I1: mvn test            | | - Reflejar cambios     | | C9: Suspense reporte  |
+--------------------------+ +--------------------------+ | I2: npm run build    |
                                                           +--------------------------+
```

---

## Diagrama de Dependencias

```
Dev 2: B1 (DELETE) <-> C1 (Front)  [coordinar contrato]
Dev 3: C2 (Sesion URL) -> C3 (WS+Polling)
Dev 2: B2 (Rol SSE) -> I3 (docs)
Dev 1: B3 (evalColor) -> B4 (PuntoSLA) -> B5 (reporte) -> I1 (tests)

Independientes:
  C4 (Cast), C6 (Middleware), C7 (Timeout), C8 (Mapa), C9 (Suspense)
```

---

## Asignacion por Developer

### Dev 1 - Backend BC2 (Simulacion)
- B3: evaluarColor en TelemetriaService
- B4: PuntoSLA cada hora virtual en TickService
- B5: Probar reporte con sesion real
- I1: mvn test

| Archivos que toca |
|---|
| `bc2/application/TelemetriaService.java` |
| `bc2/application/TickService.java` |
| `bc2/domain/PuntoSLA.java` (mod) |
| `bc2/domain/ReporteSesion.java` (mod, si se necesita) |

### Dev 2 - Backend BC1 + Seguridad (Operacion)
- B1: Fix DELETE /equipajes/{id} para aceptar idExterno
- B2: Decidir rol SSE y alinear seguridad
- I3: Actualizar api-contracts.md

| Archivos que toca |
|---|
| `bc1/infrastructure/EquipajeController.java` |
| `bc1/application/EquipajeService.java` |
| `bc1/infrastructure/PlanificacionSseController.java` |
| `shared/security/SecurityConfig.java` |
| `openspec/specs/api-contracts.md` |

### Dev 3 - Frontend
- C1: DELETE equipaje (coord con B1)
- C2: Sesion ID en URL
- C3: WS + polling duplicacion
- C4: Cast inseguro estado vuelo
- C6: Middleware de proteccion
- C7: Timeout en api.ts
- C8: Mapa posicion vuelos
- C9: Suspense reporte
- I2: npm run build

| Archivos que toca |
|---|
| `app/operacion/page.tsx` |
| `app/simulacion/page.tsx` |
| `app/simulacion/[id]/page.tsx` |
| `app/simulacion/[id]/reporte/page.tsx` |
| `middleware.ts` (nuevo) |
| `lib/api.ts` |
| `lib/useTelemetria.ts` |

---

## Reglas para no pisarse

1. **Branches separados:** Cada dev usa su rama:
   - `sprint3/backend-bc2-simulacion` (Dev 1)
   - `sprint3/backend-bc1-operacion` (Dev 2)
   - `sprint3/frontend-vistas` (Dev 3)

2. **Archivos que toca cada uno (sin solapamiento):**

| Dev | Archivos |
|---|---|
| Dev 1 | `bc2/application/TelemetriaService.java`, `bc2/application/TickService.java`, `bc2/domain/PuntoSLA.java` |
| Dev 2 | `bc1/infrastructure/EquipajeController.java`, `bc1/application/EquipajeService.java`, `bc1/infrastructure/PlanificacionSseController.java`, `shared/security/SecurityConfig.java`, `openspec/specs/api-contracts.md` |
| Dev 3 | `app/operacion/page.tsx`, `app/simulacion/page.tsx`, `app/simulacion/[id]/page.tsx`, `app/simulacion/[id]/reporte/page.tsx`, `middleware.ts` (nuevo), `lib/api.ts`, `lib/useTelemetria.ts` |

3. **Comunicacion de interfaces:**
   - Dev 2 y Dev 3 acordar contrato DELETE equipaje (UUID interno vs idExterno)
   - Dev 2 informar a Dev 1 si B2 afecta SecurityConfig de forma que impacte BC2

4. **Merge orden:**
   - Primero Dev 2 (B1, B2) - bugs criticos de operacion + seguridad
   - Luego Dev 1 (B3, B4, B5) - solo BC2, sin conflicto con Dev 2
   - Ultimo Dev 3 (C1-C9) - solo frontend, sin conflicto con backends

---

## Checklist de Integracion Final

- [ ] **Dev 1:** B3 evaluarColor implementado
- [ ] **Dev 1:** B4 PuntoSLA registrado cada hora virtual
- [ ] **Dev 1:** B5 GET /sesiones/{id}/reporte probado con sesion real
- [ ] **Dev 1:** I1 mvn test - todos pasan
- [x] **Dev 2:** B1 DELETE /equipajes/{id} funciona con idExterno
- [x] **Dev 2:** B2 Rol SSE consistente (backend + spec + frontend alineados)
- [x] **Dev 2:** I3 api-contracts.md actualizado
- [ ] **Dev 3:** C1 DELETE equipaje frontend coordinado con B1
- [ ] **Dev 3:** C2 URL de simulacion muestra UUID real del backend
- [ ] **Dev 3:** C3 Sin duplicacion de metricas (WS prioritario, polling fallback)
- [ ] **Dev 3:** C4 Cast de estado de vuelo con validacion runtime
- [ ] **Dev 3:** C6 Middleware protege rutas por rol
- [ ] **Dev 3:** C7 Timeout configurado en api.ts
- [ ] **Dev 3:** C8 Mapa de operacion muestra posicion real de vuelos
- [ ] **Dev 3:** C9 Reporte con Suspense boundary
- [ ] **Dev 3:** I2 npm run build - sin errores

---

## Specs de referencia

| Archivo | Para quien |
|---|---|
| `openspec/specs/bc2-planificacion-replanificacion.md` | Dev 1 |
| `openspec/specs/bc1-gestion-operativa.md` | Dev 2 |
| `openspec/specs/api-contracts.md` | Dev 1, Dev 2, Dev 3 |
| `openspec/specs/frontend-structure.md` | Dev 3 |
