## MODIFIED Requirements

### Requirement: Backend asigna planVuelos y coordenadas al crear vuelo

El backend `VueloService.crear()` DEBE asignar los campos `planVuelos`, `origenLat`, `origenLon`, `destinoLat` y `destinoLon` al crear un nuevo `Vuelo`. Sin estos campos, la entidad viola restricciones NOT NULL en la base de datos.

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

### Requirement: Frontend deshabilita selects cuando nodos está vacío

El frontend DEBE deshabilitar visualmente los campos `<Select>` que dependen de `nodos` cuando el array `nodos` está vacío (carga inicial o error de conexión).

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
