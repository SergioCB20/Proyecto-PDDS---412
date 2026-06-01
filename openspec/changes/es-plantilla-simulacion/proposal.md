## Why

La tabla `vuelos` contiene simultáneamente los vuelos semilla (plantilla de 24 h) y los vuelos generados para la simulación. Cuando el usuario inicia una simulación en la misma fecha que la plantilla (`2026-01-15`), ambos conjuntos de vuelos coexisten con el mismo `estado` y las mismas fechas, provocando que:

1. `TickService.procesarVuelosSalida` procese los vuelos semilla como si fueran vuelos de simulación — duplicando los vuelos EN_RUTA en el mapa
2. `MotorEnrutamiento.calcularRuta` ofrezca vuelos semilla como candidatos de ruta — asignando equipaje a vuelos con fechas incorrectas
3. `TelemetriaService` emita vuelos semilla al frontend — saturando el mapa con vuelos que no corresponden a la simulación

Además, la capa de vuelos generados no existía: solo se usaban los vuelos semilla como única fuente, sin generar vuelos nuevos por día virtual. El límite de 5 días virtuales tampoco estaba implementado (la sesión seguía corriendo indefinidamente).

## What Changes

1. **Campo `es_plantilla`** — nuevo booleano en `vuelos` que distingue vuelos semilla (`true`) de vuelos generados por simulación (`false`)
2. **Generación diaria de vuelos** — `TickService.generarVuelosSiEsNecesario()` clona la plantilla (solo vuelos con `es_plantilla = true`) al entrar a un nuevo día virtual, usando `LocalTime` de la plantilla + `LocalDate` del día virtual
3. **Filtro en todas las queries de simulación** — `TickService`, `MotorEnrutamiento`, `TelemetriaService` consultan solo vuelos con `es_plantilla = false`
4. **Auto‑stop a los 5 días** — `TickService.excedeLimiteTiempo()` detiene la sesión (`FINALIZADA`) cuando el reloj virtual supera `fecha_inicio_virtual + hora_inicio_virtual + 5 días`
5. **Frontend: fecha por defecto `2026-01-15`** — alineada con la fecha de la plantilla semilla
6. **Telemetría solo `EN_RUTA`** — se dejan de enviar vuelos `PROGRAMADO` para reducir carga en el mapa

## Capabilities

### New Capabilities

- **Generación de vuelos por día virtual**: cada día de simulación clona la plantilla de 24 h (2800 vuelos/día) con fechas correctas y `es_plantilla = false`
- **Auto‑stop por tiempo límite**: la sesión se finaliza automáticamente al cumplir 5 días virtuales

### Modified Capabilities

- **Separación plantilla/simulación**: los vuelos semilla (`es_plantilla = true`) son exclusivamente fuente de patrón horario y nunca participan en queries de simulación
- **Telemetría en vivo**: solo emite vuelos `EN_RUTA` (antes también `PROGRAMADO`)
- **Mapa operativo**: muestra únicamente vuelos activamente en tránsito

## Impact

- `backend/.../bc1/domain/Vuelo.java` — nuevo campo `esPlantilla`
- `backend/.../bc1/infrastructure/VueloRepository.java` — 4 nuevos métodos `AndEsPlantilla`
- `backend/.../bc2/application/TickService.java` — `generarVuelosSiEsNecesario()`, auto‑stop, per‑session day‑tracking `HashMap`
- `backend/.../bc2/application/MotorEnrutamiento.java` — filtro `esPlantilla = false` en consulta de candidatos
- `backend/.../bc2/application/TelemetriaService.java` — solo `EN_RUTA`, filtro `esPlantilla = false`
- `backend/.../resources/db/migration/V23__vuelos_es_plantilla.sql` — migración Flyway
- `frontend/app/simulacion/page.tsx` — fecha por defecto `2026-01-15`
- `frontend/app/simulacion/[id]/page.tsx` — fecha por defecto `2026-01-15`
