# CSV de rutas -> ultimo replanificados (4h virtuales)

> Objetivo: el "Descargar CSV de rutas" del PanelReporte debe exportar las
> ULTIMAS maletas replanificadas dentro de las ultimas 4 horas de tiempo
> virtual de la sesion, no todas las rutas planificadas.
> Duracion: 0.5 dia

---

## Tareas Completadas

| # | Tarea | Archivos | Estado |
|---|-------|----------|--------|
| 1 | `findByLoteIdIn(List<UUID>)` para batch lookup | `bc2/infrastructure/ItemLoteRepository.java` | OK |
| 2 | Inyectar `LoteReplanificacionRepository`, `ItemLoteRepository`, `EventoCancelacionRepository` | `bc2/application/ReporteService.java` | OK |
| 3 | Helper `equipajesReplanificadosRecientes(sesionId, horas)` con filtro de hora virtual | `bc2/application/ReporteService.java` | OK |
| 4 | `generarCsvRutas()` filtra planes por eq.id del set replan + nueva columna `fecha_replanificacion_virtual` | `bc2/application/ReporteService.java` | OK |
| 5 | Archivo exportado -> `replanificados_sesion_<uuid>.csv` + logs con sufijo "(4h)" | `bc2/application/ReporteService.java` | OK |
| 6 | Boton "Descargar CSV de replanificados (4h)" + filename descargable | `frontend/components/simulacion/PanelReporte.tsx` | OK |

---

## Detalle de cambios

### Comportamiento nuevo del endpoint `GET /api/sesiones/{id}/rutas/csv`

**Antes:** exportaba TODOS los `PlanViaje` de la sesion, una fila por segmento.

**Ahora:**
- Encuentra las maletas replanificadas en la ventana `[hoyVirtual - 4h, hoyVirtual]`, donde `hoyVirtual = sesion.diaHoraVirtual` (mismo patron que `obtenerEntregadosRecientes`).
- Cadena de join: `EventoCancelacion.ocurriendoEnVirtual` (rango) -> `LoteReplanificacion.eventoId` -> `ItemLote.loteId` + `ItemLote.equipajeRefId`.
- Filtra `PlanViaje` por `equipaje.id ∈ equipajesReplanificados`.
- Si una maleta fue replanificada varias veces dentro de la ventana, gana la fecha MAS RECIENTE del evento de cancelacion que la origino.
- CSV cabecera ahora incluye `...,fecha_replanificacion_virtual` (11 columnas). Filas vacias de segmentos tienen 7 comas para cuadrar.
- Sin replan en ventana -> CSV solo con cabecera (sin filas).

### Tiempo virtual vs reloj real

Sigue el mismo patron que `SesionService.obtenerEntregadosRecientes()`:
- "ahora" = `SesionEjecucion.getDiaHoraVirtual()` (no `OffsetDateTime.now()`)
- timestamp del evento = `EventoCancelacion.getOcurridoEnVirtual()` (no `ItemLote.createdAt` ni `LoteReplanificacion.creadoEn`)

Esto es importante porque la simulacion corre a velocidad diferente del reloj real.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `backend/.../bc2/infrastructure/ItemLoteRepository.java` | Nuevo metodo `findByLoteIdIn` |
| `backend/.../bc2/application/ReporteService.java` | Inyeccion 3 nuevos repos + helper + filtro + nueva columna CSV + rename archivo + logs |
| `frontend/components/simulacion/PanelReporte.tsx` | Label boton + filename descarga |

---

## Como probar

1. Iniciar sesion de simulacion (crea planes de viaje).
2. Cancelar un vuelo durante la simulacion -> genera `EventoCancelacion` + `LoteReplanificacion` + `ItemLote` y replanifica los equipajes afectados.
3. Detener sesion. Verificar log: `CSV de replanificados (4h) exportado: ...` (debe decir "(4h)"; antes decia "CSV de rutas exportado").
4. Abrir el `replanificados_sesion_<uuid>.csv` y comprobar que:
   - Solo aparecen las maletas que fueron replanificadas en las ultimas 4h virtuales.
   - Cada fila incluye la columna final `fecha_replanificacion_virtual` con el timestamp virtual del evento.
5. Descargar desde el panel: el boton dice "Descargar CSV de replanificados (4h)" y el archivo baja como `replanificados_sesion_<8chars>.csv`.
