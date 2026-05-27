# CRUD Equipaje

> **Spec owner:** PM/Lead  
> **Estado:** Draft v1  
> **Última actualización:** 27/05/2026
> **Consumidores:** Backend devs implementa · Frontend devs consume

---

## Propósito

Permitir a los operadores logísticos modificar y eliminar equipajes existentes en el sistema, además del registro ya implementado. La modificación permite corregir datos del equipaje, y la eliminación permite remover registros incorrectos o duplicados liberando los recursos asociados.

---

## Modificar equipaje

El sistema permite al OPERADOR_LOGISTICO modificar un equipaje existente mediante `PUT /api/equipajes/{id}`.

### Campos modificables

| Campo | Tipo | Descripción |
|---|---|---|
| `destino_iata` | string | Nuevo código IATA del destino |
| `vuelo_id` | UUID | Nuevo vuelo asignado |
| `sla_comprometido` | ISO 8601 | Nueva fecha/hora límite de entrega |

El `id_externo` no se modifica.

Al modificar, el sistema recalcula el plan de viaje y devuelve el `EquipajeResponse` completo incluyendo los segmentos.

### Escenarios de modificación

- **Modificar equipaje exitosamente:** PUT /api/equipajes/{id} con destino_iata, vuelo_id y sla_comprometido válidos → 200 con EquipajeResponse actualizado.
- **Equipaje inexistente:** ID no existe → 404 NO_ENCONTRADO.
- **Destino IATA inválido:** destino_iata no existe en nodos_logisticos → 422 VALIDACION_FALLIDA.
- **Vuelo inexistente:** vuelo_id no existe → 422 VALIDACION_FALLIDA.

---

## Eliminar equipaje

El sistema permite al OPERADOR_LOGISTICO eliminar un equipaje existente mediante `DELETE /api/equipajes/{id}`.

Al eliminar, el sistema:
- Elimina el equipaje
- Elimina el PlanViaje y Segmentos asociados
- Libera la carga del vuelo (incrementa carga_disponible en 1)

### Escenarios de eliminación

- **Eliminar equipaje exitosamente:** ID existente → elimina equipaje, plan de viaje, segmentos, libera carga del vuelo → 204 No Content.
- **Equipaje inexistente:** ID no existe → 404 NO_ENCONTRADO.

---

## Frontend

### Botones editar/eliminar en lista de equipajes recientes

El frontend muestra botones de editar (✏️) y eliminar (🗑️) para cada equipaje en la lista de equipajes recientes.

- El botón editar abre el formulario individual precargado con los datos del equipaje.
- El botón eliminar muestra una confirmación y llama `api.delete(/equipajes/${id})`.

### Escenario de eliminación desde frontend

- **WHEN** el usuario hace clic en 🗑️ y confirma la eliminación
- **THEN** el frontend llama DELETE /api/equipajes/{id} y remueve el equipaje del estado local
