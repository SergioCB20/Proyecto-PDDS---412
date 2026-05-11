# Proposal: Backend BC1 Events + BC3 Auditoria — TAS FB2B

## What

Publicar eventos desde BC1 (EquipajeService, CancelacionService) e implementar validacion de actualizaciones de usuarios en BC3.

## Why

BC1 necesita publicar eventos para que BC2 pueda reaccionar a registros de equipaje y cancelaciones. BC3 necesita validar que PUT /usuarios solo permita cambiar el nombre.

## Goals

- Publicar EquipajeIngresadoEvent al registrar equipaje en EquipajeService
- Publicar VueloCanceladoEvent al cancelar vuelo en CancelacionService
- Validar que PUT /usuarios solo permita cambio de nombre, rechazar cambio de rol o nodoRefId
- Agregar handlers de excepciones en GlobalExceptionHandler
- Mover seed de plan_vuelos de DataSeeder a migracion SQL

## Non-Goals

- No implementar listeners (tarea B6 de Persona 2)
- No crear nuevos endpoints

## Risks

- Ninguno — cambios pequenos y localizada