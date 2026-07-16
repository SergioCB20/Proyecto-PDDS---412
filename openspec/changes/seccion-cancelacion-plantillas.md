# Sección "Cancelación (plantillas)" en el panel de Simulación

> Objetivo: agregar en `SimulacionView` una sub-sección collapsible que muestre todas las
> plantillas (1 fila por `codigo_vuelo`) con sólo `origen -> destino`, `hora_salida` y
> `hora_llegada`, y un botón "Cancelar" que aplique la regla:
>   - `plantilla.horaSalida − momentoVirtual > 1h` → cancela la instancia de HOY + replanifica (igual que el flujo actual).
>   - `plantilla.horaSalida − momentoVirtual ≤ 1h` → cancela la instancia del DÍA SIGUIENTE sin replan. Solo incrementa `vuelosCancelados`.
> El modal al cerrar la operación muestra qué día se canceló (hoy vs +1 día).
> Duracion: 0.5 dia

---

## Tareas Completadas

| # | Tarea | Archivos | Estado |
|---|-------|----------|--------|
| 1 | Finder `findFirstByCodigoVueloAndEsPlantillaFalseAndFechaOperacion` | `bc1/infrastructure/VueloRepository.java` | OK |
| 2 | `VueloService.obtenerInstanciaDelDia`: devuelve o clona al vuelo la instancia del dia | `bc1/application/VueloService.java` | OK |
| 3 | `CancelacionService.CancelacionRequest.aplicar_regla_plantilla` (default false) | `bc1/application/CancelacionService.java` | OK |
| 4 | `CancelacionService.CancelacionResponse.fecha_operacion` + `hora_salida_cancelada` (nullable) | `bc1/application/CancelacionService.java` | OK |
| 5 | Refactor: extraer cuerpo post-lock a `cancelarEnSimulacionLocked` (evita deadlock entre callers) | `bc1/application/CancelacionService.java` | OK |
| 6 | Nuevo `cancelarSegunPlantilla(req)`: bifurca FRIO/CALIENTE; rama caliente usa `cancelarInstanciaSiguienteLocked` | `bc1/application/CancelacionService.java` | OK |
| 7 | Tipos frontend: `PlantillaResumen`, `ResultadoCancelacion`, `CancelResultResponse` | `frontend/lib/types.ts` | OK |
| 8 | Componente `SeccionCancelacion.tsx` (collapsible + tabla + modal de feedback) | `frontend/components/simulacion/SeccionCancelacion.tsx` | OK |
| 9 | Integración en `SimulacionView`: state `[plantillas]`, fetch `/vuelos?es_plantilla=true&size=500`, render condicional | `frontend/app/page.tsx` | OK |

---

## Detalle de cambios

### Backend — Regla de la cancelación

| Condición al pulsar botón | Acción | `vuelo_id` devuelto | Lote | Equipajes |
|---|---|---|---|---|
| `momentoVirtual == null` (sin reloj virtual) | 422 | — | — | — |
| `plantilla.horaSalida − momentoVirtual > 1h` (FRIO) | Cancelar instancia de hoy + replan (delegado a `cancelarEnSimulacionLocked`) | instancia de hoy | poblado | N > 0 |
| `plantilla.horaSalida − momentoVirtual ≤ 1h` (CALIENTE) | Cancelar instancia del día SIGUIENTE sin replan. Si no existe aún → se clona de la plantilla. | instancia del día siguiente | `null` | 0 |

En ambas ramas se incrementa `SesionEjecucion.vuelosCancelados` (+1). `maletasReplanificadas` solo se incrementa en la rama fría (a través de `cancelarEnSimulacionLocked`).

**Por qué refactor del lock:** `cancelarEnSimulacion` tomaba el `SesionLockManager` por sesión. Si la rama fría simplemente llamaba a `cancelarEnSimulacion` desde dentro de otro `lock.lock()`, sería deadlock (lock no es reentrant). La solución: extraer el cuerpo post-lock a un método privado `cancelarEnSimulacionLocked(SesionEjecucion, Vuelo, String causa)`. Tanto `cancelarEnSimulacion` (legacy) como `cancelarSegunPlantilla` (nuevo) toman el lock al inicio y delegan al interno. Comportamiento externo idéntico.

### Frontend — Sección plegable

- Solo visible si `estadoSesion !== "CONFIGURADA" && estadoSesion !== "FINALIZADA"`.
- Una fila por `codigo_vuelo` con `origen -> destino`, `hora_salida`, `hora_llegada`, y un botón "Cancelar" (label cambia a "→ Mañana" si dentro de la ventana caliente).
- Hover tooltip explica la regla.
- Llamada: POST `/api/simulacion/cancelacion` con `{vuelo_id: plantilla.id, causa, sesion_id, aplicar_regla_plantilla: true}`.
- Modal de feedback:
  - Frío → verde: "Cancelación aplicada al vuelo de hoy · HH:mm · N equipaje(s) replanificado(s) · lote XXXXX".
  - Caliente → ámbar: "Cancelación diferida al día siguiente DD/MM HH:mm · 0 equipajes afectados".

### Compatibilidad

- `CancelacionRequest.aplicar_regla_plantilla` con compact constructor → default `false` cuando falta en el body. Los callers legacy (`OperacionView`) siguen funcionando sin cambios.
- `CancelacionResponse` agrega 2 campos al final: `fecha_operacion` y `hora_salida_cancelada`, ambos `null` en legacy. Frontend existente no los usa → cero impacto.
- El controller `CancelacionController` no cambió: usa el record directamente, Jackson deserializa campos faltantes como null.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `backend/.../bc1/infrastructure/VueloRepository.java` | +1 finder (1 linea) |
| `backend/.../bc1/application/VueloService.java` | +`obtenerInstanciaDelDia` con clon individual al vuelo |
| `backend/.../bc1/application/CancelacionService.java` | +`aplicar_regla_plantilla` en request; +2 campos en response; refactor de lock; +`cancelarSegunPlantilla` publico; +`cancelarEnSimulacionLocked` privado; +`cancelarInstanciaSiguienteLocked` privado |
| `frontend/lib/types.ts` | +3 interfaces (PlantillaResumen, ResultadoCancelacion, CancelResultResponse) |
| `frontend/components/simulacion/SeccionCancelacion.tsx` | archivo nuevo (~225 lineas) |
| `frontend/app/page.tsx` | +state, +useEffect fetch, +render condicional al final del panel derecho del SimulacionView |

---

## Cómo probar

1. Iniciar una simulación. Esperar al menos un ciclo de tick.
2. Abrir panel `Simulacion`. Bajar hasta el bloque "Cancelación (plantillas)". Verificar lista de N plantillas (1 por `codigo_vuelo`).
3. **Caso frío**: plantilla cuya `hora_salida` está a >1h del reloj virtual actual.
   - Click "Cancelar" → modal verde: "Vuelo de hoy cancelado y replanificado · N equipaje(s) re-enrutado(s) · Lote: XXXXXXXX".
   - Verificar backend: el vuelo_instancia de hoy tiene estado `CANCELADO`; existe `LoteReplanificacion` + sus `ItemLote`.
4. **Caso caliente**: esperar hasta estar dentro de 1h de una salida de plantilla.
   - El botón cambia a "→ Mañana". Click → modal ámbar con la fecha del día siguiente.
   - Verificar backend: el vuelo_instancia de HOY sin cambios (sigue PROGRAMADO o EN_RUTA); el vuelo_instancia de MAÑANA con `estado = CANCELADO`; existe `EventoCancelacion` con `tipo = "SIMULACION_PROXIMO_DIA"`; NO existe `LoteReplanificacion` para esa cancelación; `Sesion.vuelosCancelados += 1`.
5. **Caso sin reloj virtual**: no debería estar visible cuando `estadoSesion === "CONFIGURADA"`. Si se intenta llamar al endpoint sin sesión iniciada → 422 con mensaje "La sesion no tiene reloj virtual...".

---

## Notas / Riesgos

- El `SesionLockManager` ya está compartido con `TickService.evaluarCancelaciones` y con `cancelarEnSimulacion`. El nuevo `cancelarSegunPlantilla` toma el mismo lock, garantizando exclusión mutua con el tick. No hay riesgo de carreras porque `ReentrantLock` no permite re-entrada desde el mismo thread si el outer no libera.
- La rama caliente no toca `Equipaje` alguno. Los equipajes asignados al vuelo de HOY siguen en él (no se replanifican). Esto es intencional: si están programados pero no han despegado, deben permanecer en su plan original; la cancelación del día siguiente solo previene el despegue de mañana.
- El counter `vuelosCancelados` cubre ambas ramas. El reporte acumulado no distingue entre caliente/frío — si el spec lo requiere, habría que añadir una columna adicional al `ReporteSesion` en una iteración futura.
