## Why

Al iniciar una simulación desde el módulo de simulación, los endpoints `/api/sesiones`, `/api/vuelos` y `/api/sesiones/{id}/iniciar` devuelven error 500 Internal Server Error debido a excepciones no manejadas en el backend (Redis no disponible, `Specification.anyOf()` inválida, `NullPointerException` por campos nulos, y operaciones JDBC sin protección).

## What Changes

- Corregir `Specification.anyOf()` sin argumentos en `VueloService.java` para que genere consultas JPA válidas
- Agregar null-safety al mapeo de `SesionListaResponse` para evitar NPE cuando `tipoSimulacion` es nulo
- Envolver todas las llamadas a `redisCacheService` en try-catch para que la caída de Redis no detenga el flujo
- Envolver operaciones `jdbcTemplate` en `iniciarSesion()` en try-catch para evitar 500 si la tabla `equipajes` no existe
- Agregar try-catch en `EstadoSesion.valueOf()` para valores inválidos
- Agregar handlers de excepciones faltantes en `GlobalExceptionHandler` (`DateTimeException`, `DataAccessException`, `NullPointerException`)

## Capabilities

### New Capabilities

- `error-handling-robustness`: Manejo resiliente de fallos en Redis, JDBC y valores nulos en el módulo de simulación, asegurando que el sistema degrade gracefulmente en lugar de retornar 500.

### Modified Capabilities

<!-- No existing specs are modified, only implementation details change -->

## Impact

- **Backend:** `VueloService.java`, `SesionService.java`, `GlobalExceptionHandler.java`
- **No breaking changes** en API REST — las respuestas exitosas mantienen el mismo contrato
