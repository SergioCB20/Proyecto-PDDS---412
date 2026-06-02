## Why

El Sprint 3 tiene como objetivo diagnosticar y corregir bugs para que las vistas de Simulación y Operación funcionen correctamente con datos reales del backend. Como Dev 2 (Backend BC1 + Seguridad), se identificaron dos issues críticos:

1. **B1**: El endpoint `DELETE /equipajes/{id}` esperaba `UUID id` como path variable, pero el frontend envía `idExterno` (string como `MAL-2025-00123`). Esto causaba error 400 siempre que el operador intentaba eliminar un equipaje desde la vista de operación.

2. **B2**: El controlador SSE (`PlanificacionSseController`) tenía la validación de rol hardcodeada como `OPERADOR_LOGISTICO`, cuando según `api-contracts.md` el rol correcto es `ANALISTA`. Además, la validación de rol estaba en el controlador en lugar de en `SecurityConfig`, lo que rompe el principio de seguridad centralizada.

## What Changes

### B1 — Fix DELETE /equipajes/{id} para aceptar idExterno

- **EquipajeController.java**: Cambiar `@PathVariable UUID id` → `@PathVariable String idExterno` y delegar a nuevo método en el service.
- **EquipajeService.java**: Agregar método `eliminarPorIdExterno(String)` que busca por `findByIdExterno()` del repository. Extraer lógica común a `eliminarConEquipaje()` para evitar duplicación entre `eliminar(UUID)` y `eliminarPorIdExterno(String)`.
- **EquipajeRepository.java**: Ya existía `findByIdExterno(String)` — sin cambios necesarios.

### B2 — Decidir rol SSE y alinear seguridad

- **JwtFilter.java**: Agregar soporte para `?token=` query param como fallback cuando no hay `Authorization` header. Necesario porque `EventSource` nativo del navegador no permite personalizar headers HTTP.
- **PlanificacionSseController.java**: Eliminar completamente la validación de token y role check. Ahora `JwtFilter` + `SecurityConfig` manejan toda la autenticación y autorización de forma centralizada.
- **SecurityConfig.java**: Cambiar `/api/eventos/**` de `.authenticated()` → `.hasRole("ANALISTA")` para alinear con `api-contracts.md`.

### I3 — Actualizar api-contracts.md

- Documentar que `DELETE /equipajes/{idExterno}` usa el identificador externo string.
- Agregar nota sobre `JwtFilter` reconociendo `?token=` query param para SSE.

## Capabilities

### Modified Capabilities
- `bc1-gestion-operativa.md`: DELETE equipaje ahora acepta `idExterno` string.
- `shared-security`: JwtFilter soporta `?token=` query param. SecurityConfig ahora exige `hasRole("ANALISTA")` para `/api/eventos/**`.
- `api-contracts.md`: Documentación actualizada reflejando cambios.

## Impact

### Archivos modificados (5)

| Ruta | Cambio |
|---|---|
| `bc1/infrastructure/EquipajeController.java` | `@PathVariable UUID id` → `@PathVariable String idExterno` |
| `bc1/application/EquipajeService.java` | Nuevo `eliminarPorIdExterno()`, refactor `eliminarConEquipaje()` |
| `shared/security/JwtFilter.java` | Soporte `?token=` query param |
| `shared/security/SecurityConfig.java` | `.hasRole("ANALISTA")` para `/api/eventos/**` |
| `openspec/specs/api-contracts.md` | Documentación de DELETE y SSE alineada |

### Archivos modificados en el cambio (1)

| Ruta | Cambio |
|---|---|
| `openspec/changes/sprint3-diagnostico-vistas.md` | Checklist Dev 2 marcado completo |

### Dependencias
- B1 coordina con C1 (Frontend, Dev 3): el frontend ya envía `idExterno` string, ahora el backend lo acepta.
- B2 no afecta BC2: el cambio en SecurityConfig solo impacta `/api/eventos/**` que es de BC1.
