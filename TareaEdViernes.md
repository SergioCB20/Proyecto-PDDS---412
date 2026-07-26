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

### Resumen de vista vs comportamiento de fechas

| Vista | `momentoVirtual` | Fecha mostrada |
|---|---|---|
| **Simulación** | `metricas?.dia_hora_virtual` | Fecha del reloj virtual (ej: 08/08/2027) ✅ |
| **Operación** | `realTimeMomentoOp` (cada 5s) | Fecha actual real (ej: 26/07/2026) ✅ |
| **Colapso** | `metricas?.dia_hora_virtual` | Fecha del reloj virtual (ej: 08/08/2027) ✅ |
