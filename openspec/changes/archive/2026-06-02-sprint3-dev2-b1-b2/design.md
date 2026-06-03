## Context

Las vistas de Operación y Simulación presentaban bugs que impedían su correcto funcionamiento con datos reales. Específicamente para Dev 2:

1. El frontend de operación (`operacion/page.tsx:267`) envía `idExterno` string al endpoint DELETE, pero el backend esperaba `UUID id`, causando error 400 siempre.
2. El endpoint SSE (`GET /api/eventos/planificacion`) tenía el rol incorrecto y la validación de seguridad estaba fragmentada entre el controlador y SecurityConfig.

## Goals / Non-Goals

**Goals:**
- DELETE /equipajes/{id} acepta `idExterno` string (ej. `MAL-2025-00123`)
- Rol SSE consistente: ANALISTA en todos lados (controller, SecurityConfig, api-contracts)
- Seguridad centralizada: JwtFilter como único punto de autenticación, SecurityConfig como único punto de autorización
- Compilación existosa (mvn compile)

**Non-Goals:**
- No se modifica el frontend (lo hace Dev 3 en paralelo)
- No se modifican otros endpoints de EquipajeController (PUT, GET plan-viaje)
- No se agregan nuevas funcionalidades — solo fixes

## Decisions

### D1: Buscar por idExterno en repository vs convertir string a UUID
**Decisión:** Buscar por `idExterno` usando `EquipajeRepository.findByIdExterno()`.
**Razón:** El frontend ya envía `idExterno` (código legible como `MAL-2025-00123`). Intentar convertir a UUID rompería el contrato. El repository ya tenía `findByIdExterno()`.
**Alternativa:** Convertir string a UUID — rechazado porque el frontend no tiene el UUID interno.

### D2: Refactor eliminarConEquipaje() vs duplicar lógica
**Decisión:** Extraer lógica común a `eliminarConEquipaje(Equipaje)` llamada por ambos métodos (`eliminar` y `eliminarPorIdExterno`).
**Razón:** DRY. Ambos métodos comparten el 90% del flujo (eliminar plan viaje, segmentos, ajustar carga, eliminar equipaje).
**Alternativa:** Duplicar el código en ambos métodos — rechazado por mantenibilidad.

### D3: JwtFilter con query param vs mantener auth en controller
**Decisión:** Modificar JwtFilter para reconocer `?token=` query param; eliminar toda la lógica de auth/rol del controller SSE.
**Razón:** La seguridad debe estar centralizada en el filter chain de Spring Security. El controller no debe manejar tokens ni roles. JwtFilter ahora soporta ambos mecanismos (header y query param).
**Alternativa:** Mantener auth híbrida (JwtFilter para header, controller para query param) — rechazado porque fragmenta la lógica de seguridad.

### D4: hasRole("ANALISTA") en SecurityConfig vs PreAuthorize en controller
**Decisión:** Usar `.hasRole("ANALISTA")` en SecurityConfig.
**Razón:** Consistente con el resto de endpoints del sistema. Centralizado, visible, y mantenible. El `@PreAuthorize` anterior fue eliminado junto con la refactor del controller.
**Alternativa:** `@PreAuthorize` en controller — rechazado porque mezcla dos mecanismos de autorización.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| JwtFilter ahora acepta `?token=` en cualquier endpoint, no solo SSE | El token query param solo funciona si el token es válido y el rol es correcto. No abre brecha de seguridad porque replica la misma validación que el header. |
| Frontend (Dev 3) necesita saber que DELETE ahora acepta idExterno | Coordinado vía el plan de ejecución: C1 depende de B1. El contrato está documentado en api-contracts.md. |
| El cambio en SecurityConfig (authenticated → hasRole) podría romper el SSE si JwtFilter no setea la authentication | JwtFilter ahora procesa `?token=` y setea `UsernamePasswordAuthenticationToken` en SecurityContext, por lo que `hasRole` funciona correctamente. |
