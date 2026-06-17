## Why

Durante la ejecución de simulaciones 5D se detectaron tres fallas críticas:

1. **`StaleObjectStateException` intermitente**: el tick (`TickService`) y el planificador (`SimulacionPlanificador`) corren en hilos distintos del scheduler (`spring.task.scheduling.pool.size=4`) y mutaban `segmentos_plan`/`vuelos`/`nodos` de la **misma sesión** simultáneamente. El planificador borraba (`deshacerEnrutadosEnRango`) un segmento que el tick estaba marcando `EN_CURSO` → la actualización JPA afectaba 0 filas y abortaba el tick.

2. **Planificador y `detener` colgados por minutos**: la FK `equipajes.plan_viaje_id → planes_viaje.id` no tenía índice de soporte. Cada `DELETE FROM planes_viaje` (en cada ciclo de planificación y al detener la sesión) forzaba a PostgreSQL a un **sequential scan de ~7.7M equipajes por cada fila borrada**, tardando minutos y bloqueando tanto al planificador como al endpoint `detener`.

3. **Ocupación de almacenamiento de vuelos en viaje no visible**: los vuelos `EN_RUTA` mostraban `carga_disponible = capacidad` (0% ocupado) porque el contador lo restablecía el ciclo de deshacer/re-rutear, aunque sí transportaran maletas. Además el mapa mostraba todos los vuelos (programados incluidos), saturando la vista.

## What Changes

- **Lock por sesión** (`SesionLockManager`): `TickService` y `SimulacionPlanificador` adquieren un `ReentrantLock` por sesión antes de mutar la BD de esa sesión. Sesiones distintas siguen procesándose en paralelo.
- **Índice FK** (`V38__add_equipajes_plan_viaje_index.sql`): `idx_equipajes_plan_viaje` parcial sobre `equipajes(plan_viaje_id) WHERE plan_viaje_id IS NOT NULL`, eliminando el seq scan en la validación de la FK al borrar planes.
- **`detenerSesion` robusto**: deja de ser `@Transactional` (marca `FINALIZADA` con commit inmediato para que los schedulers omitan la sesión) y usa `tryLock(60s)` para esperar de forma acotada cualquier ciclo en vuelo antes de limpiar. El orden de adquisición (lock JVM antes que lock de fila) es consistente con tick/planificador, eliminando el deadlock.
- **Ocupación determinista al despegar**: `procesarVuelosSalida` fija `carga_disponible = capacidad − maletas que realmente abordan` en el momento del despegue, independiente del contador volátil del planificador.
- **Frontend**: el mapa muestra **solo vuelos `EN_RUTA`**; `AvionAnimado` agrega una etiqueta permanente con la carga ocupada (maletas/capacidad) siempre visible.

## Capabilities

### New Capabilities

- `simulacion-concurrencia-rendimiento`: ejecución concurrente segura del tick y el planificador por sesión, rendimiento acotado de las operaciones de limpieza de planes, y visualización fiel de la ocupación de los vuelos en viaje.

### Modified Capabilities

<!-- Solo cambian detalles de implementación de bc2-planificacion-replanificacion; el contrato REST no cambia -->

## Impact

- **Backend:** `SesionLockManager.java` (nuevo), `TickService.java`, `SimulacionPlanificador.java`, `SesionService.java`, `db/migration/V38__add_equipajes_plan_viaje_index.sql` (nuevo), `TickServiceTest.java`.
- **Frontend:** `app/simulacion/[id]/page.tsx`, `components/mapa/AvionAnimado.tsx`.
- **Sin breaking changes** en el contrato REST ni en el esquema de telemetría WebSocket.
