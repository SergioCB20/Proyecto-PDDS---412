## B1 — Fix DELETE /equipajes/{id} para aceptar idExterno

- [x] 1.1 Cambiar `EquipajeController.java`: `@PathVariable UUID id` → `@PathVariable String idExterno`
- [x] 1.2 Agregar `EquipajeService.eliminarPorIdExterno(String)` que busca por `findByIdExterno()`
- [x] 1.3 Extraer lógica común a `eliminarConEquipaje(Equipaje)` para evitar duplicación
- [x] 1.4 Verificar compilación con `mvn compile`

## B2 — Decidir rol SSE y alinear seguridad

- [x] 2.1 Modificar `JwtFilter.java`: agregar soporte para `?token=` query param
- [x] 2.2 Limpiar `PlanificacionSseController.java`: eliminar validación de token y role check
- [x] 2.3 Actualizar `SecurityConfig.java`: cambiar `/api/eventos/**` de `.authenticated()` a `.hasRole("ANALISTA")`

## I3 — Actualizar api-contracts.md

- [x] 3.1 Documentar `DELETE /equipajes/{idExterno}` con `idExterno` string
- [x] 3.2 Agregar nota sobre `JwtFilter` reconociendo `?token=` query param
