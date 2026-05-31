## Why

El SLA (`sla_comprometido`) se ingresaba manualmente por el operador al registrar equipaje individual o mediante el CSV de carga masiva. Esto es incorrecto desde el punto de vista del dominio: el SLA debe calcularse automáticamente según el continente del aeropuerto origen y destino, no depende del criterio del operador.

La regla de negocio establece:
- **Mismo continente** → SLA de 24 horas desde el ingreso
- **Distinto continente** → SLA de 48 horas desde el ingreso

## What Changes

- Se agrega el campo `continente` (enum: `AMERICA_DEL_SUR`, `EUROPA`, `ASIA`) a la entidad `NodoLogistico` y a la tabla `nodos_logisticos`
- Se clasifican los 30 aeropuertos existentes por continente mediante el seeder
- Se elimina `sla_comprometido` del request de registro individual (`POST /equipajes`)
- Se elimina `sla_comprometido` del formato CSV de carga masiva
- El SLA se calcula automáticamente en el backend al registrar equipaje:
  - Se compara `nodoOrigen.continente` vs `nodoDestino.continente`
  - `fechaIngreso + 24h` si son iguales, `fechaIngreso + 48h` si son distintos
- Se elimina el campo de entrada SLA del formulario frontend y la columna SLA del preview CSV

## Capabilities

### New Capabilities
- **`clasificacion-continentes`**: `NodoLogistico` ahora tiene continente asignado, permitiendo agrupar aeropuertos por región geográfica.
- **`calculo-sla-automatico`**: El SLA se calcula automáticamente basado en continentes al registrar equipaje, eliminando la entrada manual.

### Modified Capabilities
- **`registro-equipaje`** (`POST /equipajes`): El body ya no requiere `sla_comprometido`. El backend lo calcula.
- **`carga-masiva`** (`POST /equipajes/carga-masiva`): El CSV ya no incluye `sla_comprometido` (3 columnas: `id_equipaje,destino_iata,vuelo_id`).
- **`crear-equipaje-ui`**: El formulario de registro individual ya no tiene campo de SLA.
- **`preview-carga-masiva-ui`**: La tabla de preview ya no muestra columna SLA.

## Impact

- `backend/.../domain/Continente.java` — nuevo enum
- `backend/.../domain/NodoLogistico.java` — nuevo campo + mapa de clasificación
- `backend/.../infrastructure/NodoLogisticoRepository.java` — nuevo método `findByContinenteIsNull`
- `backend/.../infrastructure/NodoVueloSeeder.java` — nuevo método `poblarContinentes()`
- `backend/.../application/EquipajeService.java` — SLA auto-calculado, request sin sla
- `backend/.../application/CargaMasivaService.java` — SLA auto-calculado, CSV sin sla
- `frontend/lib/types.ts` — `CrearEquipajeRequest` sin `sla_comprometido`, `CargaMasivaRegistro` sin `sla_comprometido`
- `frontend/app/operacion/page.tsx` — formulario sin campo SLA, preview CSV sin columna SLA
- `resources/db/migration/V20__seed_nodos_vuelos.sql` — columna `continente` en INSERT
- `openspec/specs/database-schema.md` — tabla `nodos_logisticos` con columna `continente`
- `openspec/specs/bc1-gestion-operativa.md` — nueva regla de negocio de SLA
- `openspec/specs/api-contracts.md` — endpoints actualizados
