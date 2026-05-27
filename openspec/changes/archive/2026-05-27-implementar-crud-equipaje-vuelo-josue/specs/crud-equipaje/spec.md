## ADDED Requirements

### Requirement: Modificar equipaje existente

El sistema SHALL permitir al OPERADOR_LOGISTICO modificar un equipaje existente mediante `PUT /api/equipajes/{id}`.

Los campos modificables son: `destino_iata`, `vuelo_id`, `sla_comprometido`. El `id_externo` no se modifica.

El sistema SHALL devolver la misma estructura de `EquipajeResponse` que en el registro, incluyendo el plan de viaje y sus segmentos.

#### Scenario: Modificar equipaje exitosamente
- **WHEN** un OPERADOR_LOGISTICO envía PUT /api/equipajes/{id} con destino_iata, vuelo_id y sla_comprometido válidos
- **THEN** el sistema actualiza el equipaje, recalcula el plan de viaje, y responde 200 con el EquipajeResponse actualizado

#### Scenario: Modificar equipaje inexistente
- **WHEN** un OPERADOR_LOGISTICO envía PUT /api/equipajes/{id} con un ID que no existe
- **THEN** el sistema responde 404 con error NO_ENCONTRADO

#### Scenario: Modificar equipaje con destino IATA inválido
- **WHEN** un OPERADOR_LOGISTICO envía PUT /api/equipajes/{id} con destino_iata que no existe en nodos_logisticos
- **THEN** el sistema responde 422 con error VALIDACION_FALLIDA

#### Scenario: Modificar equipaje con vuelo inexistente
- **WHEN** un OPERADOR_LOGISTICO envía PUT /api/equipajes/{id} con vuelo_id que no existe
- **THEN** el sistema responde 422 con error VALIDACION_FALLIDA

### Requirement: Eliminar equipaje

El sistema SHALL permitir al OPERADOR_LOGISTICO eliminar un equipaje existente mediante `DELETE /api/equipajes/{id}`.

Al eliminar, el sistema SHALL:
- Eliminar el equipaje
- Eliminar el PlanViaje y Segmentos asociados
- Liberar la carga del vuelo (incrementar carga_disponible en 1)

#### Scenario: Eliminar equipaje exitosamente
- **WHEN** un OPERADOR_LOGISTICO envía DELETE /api/equipajes/{id} con un ID existente
- **THEN** el sistema elimina el equipaje, su plan de viaje, segmentos, libera la carga del vuelo, y responde 204 No Content

#### Scenario: Eliminar equipaje inexistente
- **WHEN** un OPERADOR_LOGISTICO envía DELETE /api/equipajes/{id} con un ID que no existe
- **THEN** el sistema responde 404 con error NO_ENCONTRADO

### Requirement: Frontend — Botones editar/eliminar en lista de equipajes recientes

El frontend SHALL mostrar botones de editar (✏️) y eliminar (🗑️) para cada equipaje en la lista de equipajes recientes.

- El botón editar SHALL abrir el formulario individual precargado con los datos del equipaje.
- El botón eliminar SHALL mostrar una confirmación y llamar `api.delete(/equipajes/${id})`.

#### Scenario: Eliminar equipaje desde frontend
- **WHEN** el usuario hace clic en 🗑️ y confirma la eliminación
- **THEN** el frontend llama DELETE /api/equipajes/{id} y remueve el equipaje del estado local
