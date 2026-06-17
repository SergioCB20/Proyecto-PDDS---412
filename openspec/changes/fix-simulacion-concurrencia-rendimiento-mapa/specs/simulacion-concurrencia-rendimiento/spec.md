## ADDED Requirements

### Requirement: Exclusión mutua por sesión entre tick y planificador
El sistema SHALL serializar, por cada sesión, las operaciones que mutan `segmentos_plan`, `planes_viaje`, `vuelos` y `nodos_logisticos`, de modo que el tick (`TickService`) y el planificador (`SimulacionPlanificador`) nunca las ejecuten simultáneamente para la misma sesión. Sesiones distintas SHALL poder procesarse en paralelo.

#### Scenario: Tick y planificador activos sobre la misma sesión
- **WHEN** una sesión está `EN_CURSO` y tanto el tick como el ciclo de planificación se disparan en hilos distintos del scheduler
- **THEN** ambos adquieren el lock de la sesión antes de tocar la BD y se ejecutan uno después del otro
- **AND** no se produce `StaleObjectStateException` por borrado/actualización concurrente de `segmentos_plan`

#### Scenario: Dos sesiones concurrentes
- **WHEN** dos sesiones distintas están `EN_CURSO` al mismo tiempo
- **THEN** sus ticks/planificaciones se procesan en paralelo sin bloquearse entre sí

### Requirement: Índice de soporte para la FK equipajes.plan_viaje_id
El sistema SHALL mantener un índice sobre `equipajes(plan_viaje_id)` para que la validación de la FK `equipajes_plan_viaje_id_fkey` al borrar filas de `planes_viaje` use un index scan en lugar de un sequential scan de la tabla `equipajes`.

#### Scenario: Borrado de planes en ciclo de planificación
- **WHEN** `deshacerEnrutadosEnRango` ejecuta `DELETE FROM planes_viaje`
- **THEN** la validación de la FK resuelve mediante `idx_equipajes_plan_viaje`
- **AND** el ciclo de planificación no se degrada por el tamaño de la tabla `equipajes`

#### Scenario: Detención de sesión con muchos equipajes
- **WHEN** se detiene una sesión cuya BD contiene millones de equipajes
- **THEN** la limpieza de `planes_viaje` completa en segundos, no en minutos

### Requirement: Detención de sesión sin deadlock ni cuelgues
El sistema SHALL marcar la sesión como `FINALIZADA` con commit inmediato (sin transacción de larga duración) antes de adquirir el lock de la sesión, y SHALL esperar de forma acotada (`tryLock` con timeout) a que termine cualquier ciclo de tick/planificación en vuelo antes de limpiar `planes_viaje`/`segmentos_plan`.

#### Scenario: Detener mientras un ciclo está en vuelo
- **WHEN** se ejecuta `POST /api/sesiones/{id}/detener` con un ciclo de tick o planificación en curso
- **THEN** la sesión se marca `FINALIZADA` de inmediato y los schedulers la omiten en el siguiente ciclo
- **AND** la limpieza espera (lock) a que termine el ciclo en vuelo y luego borra los datos de la sesión
- **AND** la respuesta HTTP se devuelve en segundos sin deadlock

#### Scenario: Estado consistente tras detener
- **WHEN** finaliza `detener` sobre una sesión simulada
- **THEN** los equipajes de la sesión quedan en `REGISTRADO`, sus `planes_viaje`/`segmentos_plan` se eliminan, la ocupación de nodos se restablece a 0 y las instancias de vuelo se eliminan

### Requirement: Ocupación determinista de vuelos en viaje
El sistema SHALL fijar la `carga_disponible` de un vuelo en el momento del despegue como `capacidad − suma de maletas que abordan`, de forma independiente al contador que el planificador ajusta entre ciclos, de modo que los vuelos `EN_RUTA` reflejen su ocupación real.

#### Scenario: Vuelo despega con maletas asignadas
- **WHEN** un vuelo pasa a `EN_RUTA` en `procesarVuelosSalida` con N maletas abordando
- **THEN** su `carga_disponible` queda en `capacidad − N`
- **AND** la telemetría reporta la ocupación correspondiente (> 0% si N > 0)

### Requirement: El mapa muestra solo vuelos en viaje
El frontend de simulación SHALL renderizar en el mapa únicamente los vuelos en estado `EN_RUTA`, y SHALL mostrar de forma permanente la carga ocupada (maletas/capacidad) de cada vuelo en viaje.

#### Scenario: Vista del mapa durante la simulación
- **WHEN** la sesión está `EN_CURSO` y la telemetría incluye vuelos `PROGRAMADO` y `EN_RUTA`
- **THEN** el mapa muestra solo los vuelos `EN_RUTA`
- **AND** cada avión muestra una etiqueta permanente con su carga ocupada y capacidad
