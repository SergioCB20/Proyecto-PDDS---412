## 1. Concurrencia tick/planificador (StaleObjectStateException)

- [x] 1.1 Crear `SesionLockManager` con un `ReentrantLock` por sesión (`obtener`/`eliminar`)
- [x] 1.2 `TickService.procesarTick`: adquirir el lock de la sesión antes de mutar la BD (`ejecutarTick`)
- [x] 1.3 `SimulacionPlanificador.planificar`: adquirir el mismo lock antes de `ejecutarPlanificacion`
- [x] 1.4 Liberar el lock en `limpiarSesion` y en `finalizarSesionPorTiempo`
- [x] 1.5 Actualizar `TickServiceTest` para el nuevo parámetro del constructor

## 2. Rendimiento — índice FK faltante

- [x] 2.1 Crear migración `V38__add_equipajes_plan_viaje_index.sql` (`idx_equipajes_plan_viaje` parcial)
- [x] 2.2 Verificar que la validación de la FK usa Index Only Scan en vez de seq scan

## 3. `detenerSesion` robusto y sin deadlock

- [x] 3.1 Quitar `@Transactional` de `detenerSesion`; marcar `FINALIZADA` con commit inmediato
- [x] 3.2 Quitar readiness antes de adquirir el lock
- [x] 3.3 Usar `tryLock(60s)` con limpieza best-effort si no se obtiene el lock
- [x] 3.4 Inyectar `SesionLockManager` en `SesionService`

## 4. Ocupación de vuelos EN_RUTA

- [x] 4.1 `procesarVuelosSalida`: fijar `carga_disponible = capacidad − maletas que abordan` al despegar

## 5. Frontend — mapa de vuelos en viaje

- [x] 5.1 `page.tsx`: filtrar el mapa para mostrar solo vuelos `EN_RUTA`
- [x] 5.2 `AvionAnimado`: etiqueta permanente con carga ocupada (maletas/capacidad)

## 6. Verificación (runtime, Docker)

- [x] 6.1 Sesión fresca 70–95s: 0 `StaleObjectStateException`
- [x] 6.2 Planificación correcta (341 enrutados / ~4.2s, 24 sin ruta, sin colapso prematuro)
- [x] 6.3 Vuelos `EN_RUTA` con `carga_disponible < capacidad` (ocupación visible)
- [x] 6.4 Almacenamiento en escalas (nodos con `ocupacion_actual > 0`) y lifecycle completo
- [x] 6.5 `detener` completa en ~1.8s (antes colgaba) y deja la BD limpia
- [x] 6.6 Migración `V38` aplicada por Flyway (success=t) e índice presente
