## 1. Batch queue + SLA ordering

- [x] 1.1 Crear migración `V19__batch_simulacion.sql`: add `sla_comprometido TIMESTAMPTZ` + index `(estado, sla_comprometido)` a `cola_planificacion`
- [x] 1.2 Agregar campo `slaComprometido: OffsetDateTime` a `ColaPlanificacion.java` entity (getter/setter)
- [x] 1.3 Agregar query `findBatchByEstadoWithLock(String estado, int limit)` con `ORDER BY sla_comprometido ASC NULLS LAST` en `ColaPlanificacionRepository`
- [x] 1.4 Modificar `EquipajeService.registrar()` para setear `slaComprometido` en `ColaPlanificacion`
- [x] 1.5 Inyectar `SesionRepository` en `PlanificacionWorker`; implementar batch/single mode switch (if active session → batch of 50 items ordered by SLA; else → current 1-item mode)
- [x] 1.6 Extraer `completarItemConRuta()` como método compartido entre modo single y batch

## 2. TiempoInterno + RoutingStrategy batch

- [x] 2.1 Crear `TiempoInterno.java` record: horaDelDia, dia, métodos `desde()`, `totalHoras()`
- [x] 2.2 Agregar `soportaBatch()`, `optimizarLote(List<ParametroRuta>, List<Vuelo>, TiempoInterno)`, `record ParametroRuta(...)` a `RoutingStrategy`
- [x] 2.3 `GreedyRoutingStrategy`: agregar `@Qualifier("greedyRoutingStrategy")`, defaults heredados (no batch)

## 3. MotorEnrutamiento dual-strategy

- [x] 3.1 Agregar `@Qualifier("greedyRoutingStrategy")` y `@Qualifier("acoRoutingStrategy")` a MotorEnrutamiento
- [x] 3.2 Implementar `calcularRutasLote(List<Equipaje>): List<RutaResult>` usando batchStrategy
- [x] 3.3 Agregar constructor package-private para tests

## 4. ACORoutingStrategy

- [x] 4.1 Crear `ACORoutingStrategy` con `@Qualifier("acoRoutingStrategy")` y `soportaBatch() = true`
- [x] 4.2 Implementar construcción de grafo en memoria desde `List<Vuelo>` (ArcoVueloInterno, capacidadAlmacen, capacidadVuelos)
- [x] 4.3 Implementar ACO v2: feromonas, hormigas, construcción probabilística, BFS de alcanzabilidad, evaluarRuta
- [x] 4.4 Implementar `optimizarLote()` con ordenamiento por urgencia SLA, evaporación/depósito de feromonas, elitismo
- [x] 4.5 `calcularRuta()` fallback: llama a `optimizarLote()` con single item

## 5. Documentación y build

- [x] 5.1 Actualizar `TAREAS_SPRINT_2.md` con nuevas tareas B13, B14, B15
- [x] 5.2 Actualizar `openspec/specs/bc2-planificacion-replanificacion.md` con ACORoutingStrategy, TiempoInterno, modo batch
- [x] 5.3 Rebuild Docker y verificar compilación
