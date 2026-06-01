## 1. Campo `es_plantilla` en `vuelos`

- [x] 1.1 Agregar `boolean esPlantilla = false` a `Vuelo.java` con getter/setter
- [x] 1.2 Crear migración `V23__vuelos_es_plantilla.sql`: ADD COLUMN + UPDATE para semilla
- [x] 1.3 Agregar `AndEsPlantilla` query methods a `VueloRepository`
- [x] 1.4 Actualizar `generarVuelosSiEsNecesario` para query con `esPlantilla = true`
- [x] 1.5 Actualizar `procesarVuelosSalida/Llegada` y `evaluarCancelaciones` con `esPlantilla = false`
- [x] 1.6 Actualizar `MotorEnrutamiento.calcularRuta` y `calcularRutasLote` con `esPlantilla = false`
- [x] 1.7 Actualizar `TelemetriaService` con `findByEstadoInAndEsPlantilla(false)`

## 2. Generación diaria de vuelos (clonar plantilla)

- [x] 2.1 Implementar `generarVuelosSiEsNecesario()` — clonar desde `esPlantilla=true, PROGRAMADO` usando `LocalTime` + fecha virtual
- [x] 2.2 Agregar `HashMap<UUID, LocalDate>` para tracking por sesión
- [x] 2.3 Llamar desde `procesarTick()` después de `avanzarRelojVirtual()`

## 3. Auto‑stop a 5 días

- [x] 3.1 Implementar `excedeLimiteTiempo()` y `detenerSesionPorTiempo()`
- [x] 3.2 Llamar en `procesarTick()` antes del feeder
- [x] 3.3 Limpiar `ultimoDiaGeneradoPorSesion` al detener

## 4. Telemetría solo EN_RUTA

- [x] 4.1 Cambiar `findByEstadoIn(List.of(PROGRAMADO, EN_RUTA))` a `List.of(EN_RUTA)`

## 5. Frontend — fecha por defecto

- [x] 5.1 Cambiar default `fecha_inicio_virtual` de `2025-06-01` a `2026-01-15` en `simulacion/page.tsx`
- [x] 5.2 Igual en `simulacion/[id]/page.tsx`

## 6. Tests

- [x] 6.1 Actualizar `TickServiceTest` — mocks a `AndEsPlantilla` methods
- [x] 6.2 Actualizar `MotorEnrutamientoTest` — mocks a `findByEstadoAndEsPlantilla`
- [x] 6.3 Actualizar `TelemetriaServiceTest` — mocks a `findByEstadoInAndEsPlantilla`
- [x] 6.4 Verificar `mvnw test` → 25 tests, 0 failures

## 7. Documentación

- [x] 7.1 Crear `openspec/changes/es-plantilla-simulacion/` (proposal, design, tasks)
- [x] 7.2 Actualizar `openspec/specs/database-schema.md` — columna `es_plantilla`
- [x] 7.3 Actualizar `openspec/specs/bc2-planificacion-replanificacion.md` — vuelos generados, auto‑stop, esPlantilla
- [x] 7.4 Actualizar `openspec/specs/frontend-structure.md` — fecha default, telemetría
