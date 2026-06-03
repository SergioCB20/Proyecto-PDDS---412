## Why

A pesar de los fixes aplicados en `fix-simulacion-500-errors`, los endpoints `GET /api/vuelos?size=50` y `POST /api/sesiones/{id}/iniciar` continúan retornando 500 Internal Server Error debido a causas adicionales no cubiertas: `LazyInitializationException` por la relación LAZY `PlanVuelos` en la entidad `Vuelo`, `IllegalStateException` no manejada en los chequeos de estado de sesión, `vueloService.clonarPlantillas()` sin protección, y posibles valores nulos en `getDuracionDias()`.

## What Changes

- Agregar `@JsonIgnore` en `getPlanVuelos()` de la entidad `Vuelo.java` para evitar LazyInitializationException durante serialización Jackson
- Envolver `vueloService.clonarPlantillas()` en try-catch en `SesionService.iniciarSesion()`
- Agregar handler para `IllegalStateException` en `GlobalExceptionHandler` → 400 BAD_REQUEST
- Agregar null-safety para `getDuracionDias()` en `SesionService.iniciarSesion()` (default 5 si es null)
- Agregar propiedad `spring.jpa.properties.hibernate.enable_lazy_load_no_trans=true` para tolerancia general a lazy loading fuera de transacciones

## Capabilities

### New Capabilities

- `entity-serialization-safety`: Protección contra `LazyInitializationException` en entidades JPA con relaciones LAZY durante serialización JSON, y tolerancia a lazy loading fuera de transacciones.

### Modified Capabilities

- `error-handling-robustness`: Se agrega manejo de `IllegalStateException` y protección adicional para `clonarPlantillas()` en el flujo de iniciar sesión.

## Impact

- **Backend:** `Vuelo.java`, `SesionService.java`, `GlobalExceptionHandler.java`, `application.properties`
- **No breaking changes** en API REST
