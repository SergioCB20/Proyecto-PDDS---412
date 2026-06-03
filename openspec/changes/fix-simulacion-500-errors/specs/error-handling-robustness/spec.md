## ADDED Requirements

### Requirement: Redis fallback sin bloquear la simulación
El sistema SHALL tolerar la caída de Redis sin retornar error 500 al usuario.
Toda llamada a `redisCacheService` en `SesionService` SHALL estar envuelta en try-catch que registre el error como warn y permita la continuación del flujo.

#### Scenario: Redis no disponible al crear sesión
- **WHEN** se ejecuta `POST /api/sesiones` y Redis no responde
- **THEN** la sesión se crea correctamente y se registra un warn en logs
- **AND** la respuesta HTTP es 201 en lugar de 500

#### Scenario: Redis no disponible al iniciar sesión
- **WHEN** se ejecuta `POST /api/sesiones/{id}/iniciar` y Redis no responde
- **THEN** la sesión inicia correctamente y se registra un warn en logs
- **AND** la respuesta HTTP es 200 en lugar de 500

#### Scenario: Redis no disponible al pausar o detener sesión
- **WHEN** se ejecuta `POST /api/sesiones/{id}/pausar` o `POST /api/sesiones/{id}/detener` y Redis no responde
- **THEN** la operación se completa correctamente y se registra un warn en logs
- **AND** la respuesta HTTP no es 500

### Requirement: Consulta de vuelos con Specification válida
El sistema SHALL usar `Specification.where(null)` en lugar de `Specification.anyOf()` sin argumentos en `VueloService.listar()` para evitar predicados JPA inválidos.

#### Scenario: Listar vuelos sin filtros
- **WHEN** se ejecuta `GET /api/vuelos` sin parámetros de filtro
- **THEN** la consulta JPA se ejecuta sin errores
- **AND** se retorna una página de vuelos (posiblemente vacía)

### Requirement: Null-safety en mapeo de sesiones
El sistema SHALL no lanzar `NullPointerException` al mapear `SesionEjecucion` a `SesionListaResponse` cuando `tipoSimulacion` es null.

#### Scenario: Sesión sin tipo de simulación definido
- **WHEN** existe una sesión con `tipo_simulacion = NULL` en la BD
- **AND** se ejecuta `GET /api/sesiones`
- **THEN** el campo `tipo_simulacion` en la respuesta se serializa como `"VENTANA_FIJA"` (valor por defecto)
- **AND** la respuesta HTTP no es 500

### Requirement: Protección de operaciones JDBC directas
El sistema SHALL envolver en try-catch las operaciones `jdbcTemplate` en `SesionService.iniciarSesion()` para evitar 500 si la tabla `equipajes` no existe o hay errores de esquema.

#### Scenario: Tabla equipajes no existe al iniciar simulación
- **WHEN** se ejecuta `POST /api/sesiones/{id}/iniciar` y la tabla `equipajes` no existe
- **THEN** se registra un warn en logs
- **AND** la sesión inicia correctamente (sin equipajes simulados)
- **AND** la respuesta HTTP no es 500

### Requirement: Validación segura de parámetro estado en sesiones
El sistema SHALL envolver `EstadoSesion.valueOf(estado)` en try-catch en `SesionService.listarSesiones()` para valores de estado inválidos.

#### Scenario: Parámetro estado inválido
- **WHEN** se ejecuta `GET /api/sesiones?estado=INEXISTENTE`
- **THEN** se retorna una lista vacía en lugar de 500

### Requirement: Handlers de excepciones comunes en GlobalExceptionHandler
El sistema SHALL agregar `@ExceptionHandler` en `GlobalExceptionHandler` para `DataAccessException`, `DateTimeException` y `NullPointerException`.

#### Scenario: Error de base de datos
- **WHEN** ocurre un `DataAccessException` en cualquier endpoint
- **THEN** se retorna HTTP 500 con cuerpo estructurado `{ status, error, mensaje }`

#### Scenario: Error de parseo de fecha/hora
- **WHEN** se envía una fecha u hora con formato inválido a `POST /api/sesiones`
- **THEN** se retorna HTTP 400 con cuerpo estructurado `{ status, error, mensaje }`

#### Scenario: NullPointerException no esperado
- **WHEN** ocurre un `NullPointerException` en cualquier endpoint
- **THEN** se retorna HTTP 500 con cuerpo estructurado `{ status, error, mensaje }`
