# creacion-vuelo Specification

## Purpose
TBD - created by archiving change eliminar-mock-data. Update Purpose after archive.
## Requirements
### Requirement: Backend MUST assign planVuelos and coordinates when creating a flight

The backend `VueloService.crear()` MUST assign the fields `planVuelos`, `origenLat`, `origenLon`, `destinoLat` and `destinoLon` when creating a new `Vuelo`. Without these fields, the entity violates NOT NULL constraints in the database.

#### Scenario: Creación exitosa de vuelo

- **GIVEN** un operador logístico envía `POST /api/vuelos` con datos válidos (`codigo_vuelo`, `origen_id`, `destino_id`, `hora_salida`, `hora_llegada`, `capacidad_carga`)
- **WHEN** `VueloService.crear()` ejecuta
- **THEN** el servicio busca un `PlanVuelos` activo mediante `findFirstByOrderByVigenciaDesdeAsc()`
- **THEN** el servicio asigna `planVuelos`, `origenLat`, `origenLon`, `destinoLat`, `destinoLon` al vuelo
- **THEN** el repositorio guarda el vuelo sin violaciones de integridad
- **THEN** el controlador retorna `201 Created` con el `VueloResponse`

#### Scenario: No hay plan de vuelos activo

- **GIVEN** no existe ningún `PlanVuelos` en la base de datos
- **WHEN** `VueloService.crear()` ejecuta
- **THEN** el servicio lanza `ValidacionException` con mensaje "No hay plan de vuelos activo"
- **THEN** el controlador retorna `422 Unprocessable Entity`

### Requirement: Frontend MUST disable selects when nodos is empty

The frontend MUST visually disable `<Select>` fields that depend on `nodos` when the `nodos` array is empty (initial load or connection error).

#### Scenario: Selects deshabilitados mientras carga

- **GIVEN** la página de operación se carga y `nodos` es un array vacío
- **WHEN** el usuario intenta interactuar con los selects "Destino IATA", "Origen" o "Destino"
- **THEN** los selects aparecen visualmente deshabilitados (opacidad reducida, cursor `not-allowed`)
- **THEN** el placeholder muestra un mensaje informativo ("No hay destinos disponibles", "No hay nodos disponibles")

#### Scenario: Selects habilitados después de carga exitosa

- **GIVEN** la página de operación se carga y `fetchData()` retorna nodos exitosamente
- **WHEN** `nodos` se actualiza con datos del backend
- **THEN** los selects se habilitan automáticamente
- **THEN** el placeholder muestra "Seleccionar destino" / "Seleccionar origen"
- **THEN** las opciones del select contienen los códigos IATA/nombres de los nodos

