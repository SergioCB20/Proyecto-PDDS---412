## 1. VueloService — Fix Specification JPA

- [x] 1.1 Reemplazar `Specification.anyOf()` por `(root, query, cb) -> cb.conjunction()` en `VueloService.java:82`

## 2. SesionService — Null-safety y protección contra fallos

- [x] 2.1 Agregar null-safety para `tipoSimulacion` en `SesionService.java:246` (usar `VENTANA_FIJA` como default)
- [x] 2.2 Envolver `redisCacheService.setEstadoSesion()` en try-catch en `crearSesion()` (línea 97)
- [x] 2.3 Envolver `redisCacheService.setEstadoSesion()` en try-catch en `iniciarSesion()` (línea 150)
- [x] 2.4 Envolver `redisCacheService.setEstadoSesion()` en try-catch en `pausarSesion()` (línea 166)
- [x] 2.5 Envolver `redisCacheService.setEstadoSesion()` y `redisCacheService.eliminarMetricasSesion()` en try-catch en `detenerSesion()` (líneas 180-181)
- [x] 2.6 Envolver operaciones `jdbcTemplate` (CREATE TABLE, INSERT, SELECT COUNT) en try-catch en `iniciarSesion()` (líneas 130-136)
- [x] 2.7 Envolver `EstadoSesion.valueOf(estado)` en try-catch en `listarSesiones()` (línea 238), retornar lista vacía si el valor es inválido

## 3. GlobalExceptionHandler — Nuevos handlers de excepciones

- [x] 3.1 Agregar `@ExceptionHandler` para `java.time.DateTimeException` → 400 BAD_REQUEST
- [x] 3.2 Agregar `@ExceptionHandler` para `org.springframework.dao.DataAccessException` → 500 INTERNAL_SERVER_ERROR
- [x] 3.3 Agregar `@ExceptionHandler` para `NullPointerException` → 500 INTERNAL_SERVER_ERROR

## 4. Verificación

- [ ] 4.1 Verificar que `GET /api/vuelos?size=50` retorna 200 sin errores
- [ ] 4.2 Verificar que `GET /api/sesiones?estado=EN_CURSO` retorna 200 sin errores
- [ ] 4.3 Verificar que `POST /api/sesiones/{id}/iniciar` retorna 200 sin errores (con Redis caído)
- [x] 4.4 Ejecutar compilación del backend (`mvn compile`) para asegurar que no hay errores de sintaxis
