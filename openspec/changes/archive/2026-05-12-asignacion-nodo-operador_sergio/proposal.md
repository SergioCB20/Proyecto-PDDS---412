# Proposal: Asignacion de Nodo a Operadores — TAS FB2B

## What

Asignar el nodo_ref_id al usuario operador en el seeder y agregar selector de nodo en el formulario de creacion de usuarios del admin.

## Why

Segun bc1-gestion-operativa.md: "El origen se autocompleta con el nodo_ref_id del operador autenticado." Currently, the operador user has no nodo assigned, so the system cannot determine where to register luggage from.

## Goals

- Asignar nodo LIM al usuario operador en DataSeeder.java
- Agregar selector de nodos en formulario de creacion de usuarios (solo visible cuando rol = OPERADOR_LOGISTICO)
- Actualizar EquipajeController para obtener el nodo del usuario desde el token JWT (claim nodo_ref_id)
- Documentar fix de filtro de nulos en destinoOptions

## Non-Goals

- No implementar listeners de BC2
- No modificar el motor de enrutamiento

## Risks

- Ninguno — cambios pequenos y localizados