## ADDED Requirements

### Requirement: Filtro destino_iata en listado de vuelos

La consulta `GET /api/vuelos` SHALL aceptar el query param `destino_iata` para filtrar vuelos por código IATA del nodo destino.

#### Scenario: Filtrar vuelos por destino_iata
- **WHEN** un usuario autenticado envía GET /api/vuelos?destino_iata=MIA
- **THEN** el sistema devuelve solo los vuelos cuyo nodo destino tiene codigo_iata = "MIA"

### Requirement: Coordenadas lat/lng en respuesta de vuelos

La respuesta de `GET /api/vuelos` y `GET /api/vuelos/{id}` SHALL incluir los campos `origen_lat`, `origen_lon`, `destino_lat`, `destino_lon` con las coordenadas de los nodos origen y destino.

#### Scenario: Respuesta de vuelo incluye coordenadas
- **WHEN** un usuario autenticado consulta GET /api/vuelos
- **THEN** cada vuelo en la respuesta incluye origen_lat, origen_lon, destino_lat, destino_lon

## MODIFIED Requirements

### Requirement: Eliminación libera carga de vuelo

La eliminación de un equipaje SHALL incrementar en 1 la `carga_disponible` del vuelo al que estaba asignado.

#### Scenario: Liberar carga al eliminar equipaje
- **WHEN** un OPERADOR_LOGISTICO elimina un equipaje que estaba asignado a un vuelo
- **THEN** el sistema incrementa carga_disponible del vuelo en 1

### Requirement: Registro de equipaje con carga masiva

El sistema SHALL procesar archivos CSV enviados como `multipart/form-data` mediante `POST /api/equipajes/carga-masiva`.

El formato CSV esperado SHALL usar fechas ISO 8601 en la columna `sla_comprometido`.

#### Scenario: Carga masiva recibe archivo correctamente
- **WHEN** un OPERADOR_LOGISTICO envía POST /api/equipajes/carga-masiva con un archivo CSV multipart/form-data
- **THEN** el sistema procesa el archivo y devuelve un PreviewResponse con validación

#### Scenario: Error en carga masiva se loguea
- **WHEN** ocurre un error al confirmar un equipaje en carga masiva
- **THEN** el sistema registra el error con logger antes de continuar con el siguiente registro

### Requirement: Serialización snake_case en VueloResponse

Los campos de `VueloResponse` y sus sub-records SHALL serializarse en snake_case mediante `@JsonProperty`.

Campos afectados: `codigo_vuelo`, `hora_salida`, `hora_llegada`, `capacidad_carga`, `carga_disponible`, `origen_lat`, `origen_lon`, `destino_lat`, `destino_lon`.

#### Scenario: Serialización correcta
- **WHEN** el backend serializa un VueloResponse
- **THEN** los campos aparecen en snake_case en el JSON de respuesta

### Requirement: HTTP 422 para ValidacionException

`EquipajeService.ValidacionException` SHALL responder con HTTP 422 (UNPROCESSABLE_ENTITY) en lugar de 400.

#### Scenario: ValidacionException retorna 422
- **WHEN** se lanza EquipajeService.ValidacionException
- **THEN** GlobalExceptionHandler responde con status 422
