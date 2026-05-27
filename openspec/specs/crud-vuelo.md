# CRUD Vuelo

> **Spec owner:** PM/Lead  
> **Estado:** Draft v1  
> **Última actualización:** 27/05/2026
> **Consumidores:** Backend devs implementa · Frontend devs consume

---

## Propósito

Permitir a los operadores logísticos crear, modificar y eliminar vuelos en el sistema. Los vuelos son el principal medio de transporte de equipaje y su gestión CRUD es necesaria para mantener actualizado el catálogo de vuelos disponibles.

---

## Crear vuelo

El sistema permite al OPERADOR_LOGISTICO crear un nuevo vuelo mediante `POST /api/vuelos`.

El vuelo se crea con estado `PROGRAMADO` y `carga_disponible = capacidad_carga`.

### Campos requeridos

| Campo | Tipo | Descripción |
|---|---|---|
| `codigo_vuelo` | string | Código alfanumérico del vuelo (ej. LA2402) |
| `origen_id` | UUID | ID del nodo origen |
| `destino_id` | UUID | ID del nodo destino |
| `hora_salida` | ISO 8601 | Fecha/hora de salida programada |
| `hora_llegada` | ISO 8601 | Fecha/hora de llegada programada |
| `capacidad_carga` | int | Capacidad máxima de equipajes |

### Escenarios de creación

- **Crear vuelo exitosamente:** OPERADOR_LOGISTICO envía POST /api/vuelos con campos válidos → 201 con VueloResponse (estado PROGRAMADO, carga_disponible = capacidad_carga).
- **Origen inexistente:** origen_id no existe → 422 VALIDACION.
- **Destino inexistente:** destino_id no existe → 422 VALIDACION.

---

## Modificar vuelo

El sistema permite al OPERADOR_LOGISTICO modificar un vuelo existente mediante `PUT /api/vuelos/{id}`.

Solo se permite modificar vuelos con estado `PROGRAMADO`.

Al modificar `capacidad_carga`, se reinicia `carga_disponible` al nuevo valor.

### Campos modificables

Los mismos que en creación: `codigo_vuelo`, `origen_id`, `destino_id`, `hora_salida`, `hora_llegada`, `capacidad_carga`.

### Escenarios de modificación

- **Modificar vuelo exitosamente:** PUT /api/vuelos/{id} con vuelo PROGRAMADO y datos válidos → 200 con VueloResponse.
- **Vuelo no PROGRAMADO:** vuelo en estado EN_RUTA o CANCELADO → 422 VALIDACION.
- **Vuelo inexistente:** ID no existe → 404 NO_ENCONTRADO.

---

## Eliminar vuelo

El sistema permite al OPERADOR_LOGISTICO eliminar un vuelo mediante `DELETE /api/vuelos/{id}`.

Solo se permite eliminar vuelos con estado `PROGRAMADO`. No se permite eliminar un vuelo que tenga equipajes asignados.

### Escenarios de eliminación

- **Eliminar vuelo exitosamente:** vuelo PROGRAMADO sin equipajes → 204 No Content.
- **Vuelo con equipajes asignados:** vuelo tiene equipajes → 422 VALIDACION.
- **Vuelo no PROGRAMADO:** vuelo EN_RUTA → 422 VALIDACION.

---

## Frontend

### Botón "Nuevo Vuelo"

El frontend muestra un botón "Nuevo Vuelo" al lado del botón "Individual" en la vista de operación.

El formulario incluye campos: código, origen (select de nodos), destino (select de nodos), hora salida, hora llegada, capacidad de carga.

### Botones editar/eliminar en lista de vuelos

El frontend muestra botones editar/eliminar en cada vuelo de la lista, solo para vuelos con estado `PROGRAMADO`.

- Editar llama `api.put(/vuelos/${id}, data)`.
- Eliminar llama `api.delete(/vuelos/${id})`.
