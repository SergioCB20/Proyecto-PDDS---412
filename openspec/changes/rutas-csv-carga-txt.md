# Carga TXT desde archivos + Exportacion CSV de rutas planificadas

> Objetivo: Corregir la carga de archivos `_envios_*.txt` (regex mal匹配) y generar logs/archivos CSV con las rutas planificadas por el algoritmo para cada maleta.
> Duracion: 1 dia

---

## Tareas Completadas

| # | Tarea | Archivos | Estado |
|---|-------|----------|--------|
| 1 | Fix regex FILE_PATTERN | `CargaSimulacionService.java` | ✅ |
| 2 | Agregar `sesion_id` a `planes_viaje` + route logging | `PlanViaje.java`, `PlanViajeRepository.java`, `SimulacionEnrutamientoService.java` | ✅ |
| 3 | Endpoint CSV `GET /api/sesiones/{id}/rutas/csv` | `ReporteService.java`, `MetricasController.java` | ✅ |
| 4 | Auto-export CSV al finalizar sesion | `ReporteService.java` (onSesionFinalizada) | ✅ |
| 5 | Volume mounts Docker para datos y reportes | `docker-compose.yml` | ✅ |

---

## Detalle de cambios

### 1. Fix regex FILE_PATTERN
- **Problema:** El patron `^_envios_([A-Z0-9]{4})\\.txt$` no matcheaba los archivos reales `_envios_EBCI_.txt` (tienen un underscore extra antes de `.txt`).
- **Solucion:** Cambiado a `^_envios_([A-Z0-9]{4})_\\.txt$`.
- **Resultado:** Los 30 archivos en `data/` ahora se procesan correctamente (~20k+ lineas).

### 2. sesion_id en PlanViaje + logging
- Agregado campo `sesionId` (UUID, columna `sesion_id`) a la entidad `PlanViaje`.
- `SimulacionEnrutamientoService.crearPlanViaje()` ahora recibe y persiste el `sesionId`.
- Cada vez que se crea un PlanViaje, se loggea:
  ```
  RUTA equipaje=<uuid> origen=SKBO destino=SCEL segmentos= [1] SKBO->SCEL (AV123 2026-08-01T10:00Z)
  ```
- `PlanViajeRepository` tiene nuevo metodo `findBySesionId(UUID)`.

### 3. Endpoint CSV de rutas
- `GET /api/sesiones/{id}/rutas/csv` devuelve archivo CSV descargable con columnas:
  `equipaje_id, origen_iata, destino_iata, sla_comprometido, segmento_orden, vuelo_codigo, nodo_origen_iata, nodo_destino_iata, hora_salida, hora_llegada`
- Una fila por segmento (si un equipaje tiene 2 vuelos, genera 2 filas).
- Endpoint protegido con `@PreAuthorize("hasRole('ANALISTA')")`.
- Implementado en `ReporteService.generarCsvRutas()` y expuesto via `MetricasController`.

### 4. Auto-export CSV al finalizar sesion
- `ReporteService.onSesionFinalizada()` ahora tambien llama a `exportarCsvRutas()`.
- El CSV se guarda en `data/reportes/rutas_sesion_{uuid}.csv`.
- El directorio se monta via Docker volume para acceso desde el host.

### 5. Volume mounts Docker
- `./backend/backend/src/main/resources/data:/data/envios` — archivos TXT de entrada.
- `./backend/backend/src/main/resources/reportes:/data/reportes` — CSVs de salida.
- Variable `RUTA_ENVIOS=/data/envios/` y `APP_REPORTES_RUTA_ARCHIVOS=/data/reportes`.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `backend/.../bc1/application/CargaSimulacionService.java` | Regex fix (line 38) |
| `backend/.../bc1/domain/PlanViaje.java` | Campo `sesionId` + getter/setter |
| `backend/.../bc1/infrastructure/PlanViajeRepository.java` | `findBySesionId()` + import `List` |
| `backend/.../bc2/application/SimulacionEnrutamientoService.java` | `crearPlanViaje` recibe `sesionId`, logging de ruta |
| `backend/.../bc2/application/ReporteService.java` | `generarCsvRutas()`, `exportarCsvRutas()`, auto-export en evento |
| `backend/.../bc2/infrastructure/MetricasController.java` | Endpoint `GET /{id}/rutas/csv` |
| `docker-compose.yml` | Volume mounts data/ y reportes/ + env vars |

---

## Como probar

1. Verificar carga TXT en logs: `docker compose logs backend | findstr "Carga automatica"`
2. Iniciar sesion de simulacion (crea PlanViaje con `sesion_id`)
3. Descargar CSV: `GET /api/sesiones/{id}/rutas/csv` (con token de ANALISTA)
4. Al detener sesion, el CSV se guarda automaticamente en `backend/src/main/resources/reportes/`
