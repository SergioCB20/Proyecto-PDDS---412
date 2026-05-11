# Proposal: Shared Events — TAS FB2B

## What

Crear 3 eventos compartidos (record classes de Java) en `shared/events/` para permitir la comunicacion entre bounded contexts del backend.

## Why

BC1 necesita publicar eventos al registrar equipaje o cancelar vuelos. BC2 necesita escuchar esos eventos para replanificar automaticamente. Los eventos compartidos son el contrato entre contextos.

## Goals

- Crear `EquipajeIngresadoEvent` — publicado al confirmar registro de equipaje
- Crear `VueloCanceladoEvent` — publicado al cancelar un vuelo
- Crear `UbicacionActualizadaEvent` — publicado al actualizar ubicacion de equipaje

## Non-Goals

- No implementar listeners ni publishers aun (tareas A1 y B6)
- No crear eventos para BC2 (stateless motor no necesita publicar)

## Risks

- Ninguno — solo creacion de record classes simples