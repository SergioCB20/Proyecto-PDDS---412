## Context

Actualmente, el módulo de simulación (backend bc2) tiene varios puntos frágiles que causan 500 Internal Server Error cuando algo falla:

- **Redis**: No hay tolerancia a fallos. Si Redis no está disponible, cualquier operación de caché lanza `RedisConnectionFailureException` no manejada.
- **JPA Specifications**: `VueloService.listar()` usa `Specification.anyOf()` sin argumentos, generando un predicado inválido (`cb.or(new Predicate[0])`) que lanza excepción al ejecutar la consulta.
- **Null safety**: `SesionService.listarSesiones()` asume que `tipoSimulacion` nunca es null, aunque el campo puede serlo (sesiones previas a migración o sin ese valor).
- **JDBC directo**: `iniciarSesion()` ejecuta `CREATE TABLE ... LIKE equipajes` sin validar que la tabla exista, lanzando excepción SQL no manejada.
- **GlobalExceptionHandler**: Faltan handlers para excepciones comunes (`DataAccessException`, `DateTimeException`, `NullPointerException`).

## Goals / Non-Goals

**Goals:**
- Eliminar errores 500 en los endpoints `/api/sesiones`, `/api/vuelos`, `/api/sesiones/{id}/iniciar`
- Hacer que Redis sea opcional (degradación graceful)
- Proteger operaciones JDBC directas con try-catch
- Agregar null-safety en mapeos de respuesta
- Agregar handlers de excepciones faltantes en GlobalExceptionHandler

**Non-Goals:**
- No se agregan nuevas funcionalidades ni endpoints
- No se modifica el contrato de API REST existente
- No se cambia la configuración de Docker Compose ni infraestructura

## Decisions

### Decisión 1: try-catch en Redis en lugar de `@ConditionalOnProperty`
- **Opción A (elegida):** Envolver cada llamada a `redisCacheService` en try-catch individual en `SesionService`
- **Opción B:** Hacer Redis opcional con `@ConditionalOnProperty` y un `NoOpRedisCacheService` de respaldo
- **Por qué A:** Menor cambio, no requiere nueva abstracción. Redis es parte integral del caché de simulación; si falla, la simulación puede continuar sin caché momentáneamente.

### Decisión 2: `Specification.where(null)` en lugar de `Specification.anyOf()`
- **Opción A (elegida):** `Specification.where(null)` inicia una especificación neutral (no filtra nada)
- **Opción B:** Usar `(root, query, cb) -> cb.conjunction()` para iniciar con TRUE
- **Por qué A:** Es el patrón estándar de Spring Data JPA para empezar una especificación vacía y luego encadenar `.and()`. Más idiomático y predecible.

### Decisión 3: Handler genérico para `NullPointerException`
- **Opción A (elegida):** Agregar handler para `NullPointerException` que retorna 500 con mensaje genérico
- **Opción B:** No agregar handler y dejar que caiga al handler genérico `Exception.class`
- **Por qué A:** Ya existe un handler `Exception.class` que captura todo, pero es preferible tener explicititud y consistencia con otros handlers específicos.

## Risks / Trade-offs

- **[Risk]** Los try-catch en Redis ocultan silenciosamente fallos de conectividad → **[Mitigation]** Se registra siempre un `log.warn()` con el detalle del error para trazabilidad
- **[Risk]** El try-catch en `jdbcTemplate` podría ocultar errores de esquema reales → **[Mitigation]** Se registra el error con `log.warn()` y se permite que `iniciarSesion()` continúe sin datos de equipajes simulados
- **[Trade-off]** Agregar más handlers en `GlobalExceptionHandler` aumenta el mantenimiento, pero mejora la experiencia de debugging
