# Tarea EdViernes — Corrección de fechas y badge clickeable en cancelaciones

## Problema 1: Fechas incorrectas en panel de cancelación

**Síntoma:** En la vista simulación, el panel flotante de vuelos muestra fechas correctas (ej: 08/08/2027), pero el panel de cancelación muestra `15/01/2026` para los mismos vuelos.

**Causa raíz:** El panel de vuelos usa datos de telemetría del WebSocket (fechas dinámicas del reloj virtual). El panel de cancelación usa `PlantillaResumen[]` obtenido de `GET /api/vuelos?es_plantilla=true`, que devuelve las filas `es_plantilla` con `fecha_operacion = 2026-01-15` (fecha del seed). Esas fechas nunca se re-anclan al día virtual de la simulación.

**Solución:** La función `fmtHora()` en `SeccionCancelacion.tsx` ahora acepta `momentoVirtual?: string | null`. Cuando el reloj virtual está disponible, re-ancla la fecha mostrada: toma el *time-of-day* (HH:MM) de la plantilla y la *fecha* del momento virtual, igual que ya hace `minutosHastaSalidaPlantilla` en `horasVirtuales.ts`.

**Archivos modificados:**
- `frontend/components/simulacion/SeccionCancelacion.tsx` — `fmtHora()` re-ancla con `momentoVirtual`

---

## Problema 2: Badge de vuelo replanificado clickeable

**Síntoma:** Al cancelar un vuelo, las maletas re-enrutadas se muestran con su código y ruta, pero no hay forma de navegar al detalle del vuelo de replanificación para verificar que la maleta fue correctamente reasignada.

**Solución:** El badge azul con el código del vuelo de replan (ej: `TAS-456`) ahora es un botón clickeable. Al hacer clic, se abre el modal `ModalEnvios` con el detalle de ese vuelo, y la maleta en cuestión aparece resaltada con un borde azul y una etiqueta "Re-enrutada".

### Cambios realizados

#### `frontend/lib/types.ts`
- Nueva interfaz `SegmentoReplanInfo` — segmento del plan de viaje de replanificación
- Nueva interfaz `EquipajeCancelacion` — equipaje en respuesta de cancelación con campos `vuelo_replanificado_id`, `vuelo_replanificado_codigo`, `plan_viaje`
- `ResultadoCancelacion.equipajes` actualizado a `EquipajeCancelacion[]`
- `CancelResultResponse.equipajes` actualizado a `EquipajeCancelacion[]`

#### `frontend/components/simulacion/SeccionCancelacion.tsx`
- Fix: `fmtHora()` re-ancla fecha con `momentoVirtual`
- Nueva prop `onVerDetalleEnvio?: (vueloId, vueloCodigo, equipajeId) => void`
- En el modal de resultado, cada equipaje muestra su `vuelo_replanificado_codigo` como badge `<button>` clickeable
- Nueva prop `cancelEndpoint?: string` (default `"/simulacion/cancelacion"`) para soportar `/operacion/cancelacion`

#### `frontend/components/simulacion/PanelDetalleCancelaciones.tsx`
- Nueva prop `onVerDetalleEnvio` propagada a `DetalleCancelacion`
- El badge del vuelo replanificado (antes `<span>`) ahora es `<button>` clickeable
- Usa `eq.vuelo_replanificado_codigo` directamente (ya no depende solo del fetch de `planViaje`)

#### `frontend/components/shared/ModalEnvios.tsx`
- Nueva prop `highlightedEquipajeId?: string | null`
- Cuando un envío (`EnvioItemResponse.id`) coincide con `highlightedEquipajeId`, la tarjeta se resalta con `ring-1 ring-blue-300` y muestra etiqueta "Re-enrutada"

#### `frontend/app/page.tsx`
- **Simulación view:** nuevo estado `highlightedEquipajeIdSim`, callback `onVerDetalleEnvio` en `SeccionCancelacion` y `PanelDetalleCancelaciones`, y prop `highlightedEquipajeId` en `ModalEnvios`
- **Colapso view:** mismo patrón con `highlightedEquipajeIdCol`
- **Operación view:** replicado completo del sistema de cancelaciones:
  - Estados: `historialCancelOp`, `showCancelDetalleOp`, `selectedCancelDetalleOp`, `highlightedEquipajeIdOp`, `plantillasOp`
  - `realTimeMomentoOp` — se actualiza cada 5s con `new Date().toISOString()` para re-anclar fechas en tiempo real
  - Fetch de plantillas desde `GET /api/vuelos?es_plantilla=true&size=100000`
  - Dock items: `cancelacion` (ícono XCircle) agregado al menú lateral
  - `SeccionCancelacion` con `cancelEndpoint="/operacion/cancelacion"` y `momentoVirtual={realTimeMomentoOp}`
  - `PanelDetalleCancelaciones` con `onVerDetalleEnvio`
  - `ModalEnvios` con `highlightedEquipajeIdOp` y limpieza en `onClose`

### Flujo de usuario

1. Usuario cancela un vuelo desde el panel de cancelación (en cualquiera de las 3 vistas)
2. En el modal de resultado, cada equipaje re-enrutado muestra un badge azul con el código del vuelo de replan (ej: `TAS-456`)
3. Usuario hace clic en el badge → se abre `ModalEnvios` con el detalle de ese vuelo
4. El equipaje consultado aparece resaltado con borde azul y etiqueta "Re-enrutada" como evidencia visual

### Backend

No se requirieron cambios. El backend ya devuelve `vuelo_replanificado_id`, `vuelo_replanificado_codigo` y `plan_viaje` en el response `CancelacionResponse.equipajes` (Java `EquipajeAfectado`). El endpoint `/api/operacion/cancelacion` acepta la misma estructura de request y devuelve el mismo response que `/simulacion/cancelacion`.

### Problema 3: Fechas incorrectas en detalle de cancelación

**Síntoma:** En el panel `PanelDetalleCancelaciones` (vista detalle de una cancelación), la "Salida programada" mostraba `15/01/2026` (fecha raw de la plantilla) en vez de la fecha virtual `08/08/2027`. Además, la "Diferencia" calculaba ~500K minutos por restar `2026-01-15` vs `2027-08-08`.

**Causa raíz:** `fmtHoraCorta`, `fmtHoraMin` y `calcularDiferencia` usaban `hora_salida_programada` como timestamp absoluto, sin re-anclar la fecha al momento virtual de cancelación.

**Solución:** Se agregó la función helper `reAnclarAFecha(iso, fechaReferencia)` que toma el *time-of-day* de `iso` y la *fecha* de `fechaReferencia`. Se aplicó en:

- `fmtHoraCorta(iso, referencial?)` — si recibe `referencial`, re-ancla antes de formatear
- `fmtHoraMin(iso, referencial?)` — igual, solo hora/minutos
- `calcularDiferencia(salidaISO, cancelISO)` — re-ancla `salidaISO` a la fecha de `cancelISO` antes de calcular

**Archivo modificado:**
- `frontend/components/simulacion/PanelDetalleCancelaciones.tsx`

---

## Problema 4: Vista Operación mostraba 2000 plantillas seed en vez de las del archivo

**Síntoma:** En Operación, el panel "Cancelación (plantillas)" mostraba ~2000 vuelos seed (TAS0001-TAS2000) no relacionados con el archivo cargado en `SetupOperacion`.

**Causa raíz:** `plantillasOp` se cargaba de `GET /api/vuelos?es_plantilla=true` (todas las plantillas de la BD, ~2866 registros) sin filtrar por el archivo subido vía `POST /api/operacion/preparacion/planes`.

**Solución:** Reemplazar la fuente de `plantillasOp` por `fetchPlanesOperacion()`, que devuelve solo las plantillas cargadas desde el archivo (taggeadas con `tag_dia_a_dia`). El efecto se gatilla cuando `stage === "mapa"`.

**Archivo modificado:**
- `frontend/app/page.tsx` — reemplazado `useEffect` que usaba `GET /vuelos?es_plantilla=true` por `fetchPlanesOperacion()` con dep `[stage]`

---

## Problema 5: Desfase temporal en regla de ±60 min (Simulación + Operación)

**Síntoma:** El frontend mostraba el botón "Cancelar" (>60 min antes de salida), pero al confirmar el backend respondía "demasiado próximo a su salida" y defería al día siguiente. Esto ocurría en Simulación por el factor k=120 (el backend avanza el reloj virtual más rápido de lo que el frontend puede mostrar), y en Operación porque `sesion.getDiaHoraVirtual()` es null para sesiones EN_VIVO.

**Causa raíz:** El backend usaba `sesion.getDiaHoraVirtual()` como fuente única para decidir hot/cold path, mientras el frontend mostraba su propio `momentoVirtual` (de métricas en Simulación o tiempo real en Operación). En Simulación, k=120 hace que el backend avance ~10 min virtuales por cada 5s reales, generando desfasaje si el usuario tarda >30s en confirmar. En Operación, `diaHoraVirtual` nunca se inicializa para sesiones EN_VIVO, lanzando excepción.

**Solución:** El frontend envía `momento_virtual` en el body del POST `/cancelacion`, y el backend lo usa como fuente de verdad con prioridad sobre `sesion.getDiaHoraVirtual()` (que queda como fallback para backward compatibility).

**Archivos modificados:**
| Archivo | Cambio |
|---|---|
| `CancelacionService.java` | Agregado campo `OffsetDateTime momento_virtual` al record `CancelacionRequest`. En `cancelarSegunPlantilla()`, línea 246: usa `request.momento_virtual()` como prioridad antes de `sesion.getDiaHoraVirtual()`. |
| `OperacionCancelacionController.java` | Pasado `request.momento_virtual()` al reconstruir `CancelacionRequest` (línea 38). |
| `SeccionCancelacion.tsx` | Agregado `momento_virtual: momentoVirtual` al body del POST (línea 117). |

---

## Problema 6: Paginación truncaba plantillas a 2000

**Síntoma:** El panel "Cancelaciones (plantillas)" mostraba 2000/2000 vuelos, no alcanzando los 3000 vuelos visibles en el panel "Vuelos".

**Causa raíz:** Spring Boot por defecto tiene `spring.data.web.pageable.max-page-size=2000`. El frontend enviaba `size=100000`, pero el backend truncaba a 2000.

**Solución:** Agregar `spring.data.web.pageable.max-page-size=3000` en `application.properties`.

**Archivo modificado:**
- `backend/backend/src/main/resources/application.properties`

---

## Resumen de cambios

| # | Problema | Archivos |
|---|---|---|
| 1 | Fechas seed en panel cancelación | `SeccionCancelacion.tsx` |
| 2 | Badge replan clickeable | `types.ts`, `SeccionCancelacion.tsx`, `PanelDetalleCancelaciones.tsx`, `ModalEnvios.tsx`, `page.tsx` |
| 3 | Fechas raw en detalle cancelación | `PanelDetalleCancelaciones.tsx` |
| 4 | 2000 plantillas seed en Operación | `page.tsx` (fetchPlanesOperacion) |
| 5 | Desfase temporal hot/cold path | `CancelacionService.java`, `OperacionCancelacionController.java`, `SeccionCancelacion.tsx` |
| 6 | Paginación truncada a 2000 | `application.properties` |

### Resumen de vista vs comportamiento de fechas

| Vista | `momentoVirtual` / referencial | Fecha mostrada |
|---|---|---|
| **Simulación** | `metricas?.dia_hora_virtual` | Fecha del reloj virtual (ej: 08/08/2027) ✅ |
| **Operación** | `realTimeMomentoOp` (cada 5s) | Fecha actual real (ej: 26/07/2026) ✅ |
| **Colapso** | `metricas?.dia_hora_virtual` | Fecha del reloj virtual (ej: 08/08/2027) ✅ |
| **Detalle cancelación** | `c.momento_cancelacion` como referencial | Fecha del momento de cancelación ✅ |

### Cancelaciones: fuente de verdad del reloj

| Vista | `momentoVirtual` que envía el frontend | Backend usa |
|---|---|---|
| **Simulación / Colapso** | `metricas?.dia_hora_virtual` | `request.momento_virtual()` (prioridad) |
| **Operación** | `realTimeMomentoOp` (cada 5s) | `request.momento_virtual()` (prioridad) |
| **Fallback** | — | `sesion.getDiaHoraVirtual()` (solo si request no trae) |
