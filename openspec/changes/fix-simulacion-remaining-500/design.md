## Context

Después del primer cambio `fix-simulacion-500-errors`, los endpoints de simulación aún retornan 500. El análisis identificó causas adicionales:

- **Vuelo.java** tiene `planVuelos` con `fetch = FetchType.LAZY` y un getter público `getPlanVuelos()`. Aunque `toResponse()` no lo accede, Jackson puede intentar serializar la propiedad al inspeccionar la entidad, lanzando `LazyInitializationException`.
- **SesionService.iniciarSesion()** lanza `IllegalStateException` en validaciones de estado (líneas 108, 115), pero no hay handler para esta excepción en `GlobalExceptionHandler`.
- **`vueloService.clonarPlantillas()`** se ejecuta sin try-catch en `iniciarSesion()`. Si falla (ej: esquema BD incompleto), propaga excepción → 500.
- **`sesion.getDuracionDias()`** puede ser null si no se configuró, causando NPE en `OffsetDateTime.plusDays(null)`.

## Goals / Non-Goals

**Goals:**
- Eliminar `LazyInitializationException` en serialización de Vuelo
- Proteger `clonarPlantillas()` contra fallos
- Manejar `IllegalStateException` gracefulmente
- Tolerar valores nulos en `duracionDias`
- Agregar propiedad global para lazy loading

**Non-Goals:**
- No se modifican relaciones JPA ni esquema de BD
- No se agregan nuevas funcionalidades
- No se cambia el comportamiento de autenticación

## Decisions

### Decisión 1: `@JsonIgnore` en getPlanVuelos vs cambiar a EAGER
- **Opción A (elegida):** Agregar `@JsonIgnore` en el getter `getPlanVuelos()`
- **Opción B:** Cambiar a `FetchType.EAGER`
- **Por qué A:** EAGER causaría joins innecesarios en todas las consultas de Vuelo, impactando performance. `@JsonIgnore` es mínimamente invasivo y solo afecta serialización.

### Decisión 2: `enable_lazy_load_no_trans` global vs no agregarlo
- **Opción A (elegida):** Agregar `spring.jpa.properties.hibernate.enable_lazy_load_no_trans=true`
- **Opción B:** No agregarlo, confiar en `@JsonIgnore` y EAGER
- **Por qué A:** Esta propiedad es un safety net general que evita LazyInitializationException en cualquier contexto fuera de transacciones. Bajo riesgo y alta recompensa.

### Decisión 3: Handler para IllegalStateException
- **Opción A (elegida):** Agregar `@ExceptionHandler` en `GlobalExceptionHandler` → 400 BAD_REQUEST
- **Opción B:** Convertir a `IllegalArgumentException` en el service (ya hay handler)
- **Por qué A:** Son semánticamente diferentes. `IllegalArgumentException` es para argumentos inválidos, `IllegalStateException` es para estado inválido. Separarlos permite mejor diagnóstico.

## Risks / Trade-offs

- **[Risk]** `enable_lazy_load_no_trans=true` puede ocultar problemas N+1 en consultas → **[Mitigation]** Es una práctica estándar en desarrollo, no afecta producción.
- **[Risk]** `@JsonIgnore` en `getPlanVuelos()` oculta el plan de vuelos de la respuesta JSON → **[Mitigation]** La respuesta de Vuelo ya excluye este campo manualmente via `toResponse()`, es consistente.
- **[Trade-off]** Los try-catch adicionales pueden ocultar errores reales → **[Mitigation]** Todos registran `log.warn()` con el detalle.
