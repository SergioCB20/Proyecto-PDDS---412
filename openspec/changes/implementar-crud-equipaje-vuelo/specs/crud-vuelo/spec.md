## ADDED Requirements

### Requirement: Crear vuelo

El sistema SHALL permitir al OPERADOR_LOGISTICO crear un nuevo vuelo mediante `POST /api/vuelos`.

El vuelo se crea con estado `PROGRAMADO` y `carga_disponible = capacidad_carga`.

Campos requeridos: `codigo_vuelo`, `origen_id`, `destino_id`, `hora_salida`, `hora_llegada`, `capacidad_carga`.

#### Scenario: Crear vuelo exitosamente
- **WHEN** un OPERADOR_LOGISTICO envía POST /api/vuelos con todos los campos válidos
- **THEN** el sistema crea el vuelo con estado PROGRAMADO, carga_disponible = capacidad_carga, y responde 201 con VueloResponse

#### Scenario: Crear vuelo con origen inexistente
- **WHEN** un OPERADOR_LOGISTICO envía POST /api/vuelos con origen_id que no existe
- **THEN** el sistema responde 422 con error VALIDACION

#### Scenario: Crear vuelo con destino inexistente
- **WHEN** un OPERADOR_LOGISTICO envía POST /api/vuelos con destino_id que no existe
- **THEN** el sistema responde 422 con error VALIDACION

### Requirement: Modificar vuelo

El sistema SHALL permitir al OPERADOR_LOGISTICO modificar un vuelo existente mediante `PUT /api/vuelos/{id}`.

Solo se permite modificar vuelos con estado `PROGRAMADO`.

Campos modificables: `codigo_vuelo`, `origen_id`, `destino_id`, `hora_salida`, `hora_llegada`, `capacidad_carga`.

Al modificar `capacidad_carga`, SHALL reiniciar `carga_disponible` al nuevo valor.

#### Scenario: Modificar vuelo exitosamente
- **WHEN** un OPERADOR_LOGISTICO envía PUT /api/vuelos/{id} con un vuelo PROGRAMADO y datos válidos
- **THEN** el sistema actualiza el vuelo y responde 200 con VueloResponse

#### Scenario: Modificar vuelo no PROGRAMADO
- **WHEN** un OPERADOR_LOGISTICO envía PUT /api/vuelos/{id} con un vuelo en estado EN_RUTA o CANCELADO
- **THEN** el sistema responde 422 con error VALIDACION

#### Scenario: Modificar vuelo inexistente
- **WHEN** un OPERADOR_LOGISTICO envía PUT /api/vuelos/{id} con un ID que no existe
- **THEN** el sistema responde 404 con error NO_ENCONTRADO

### Requirement: Eliminar vuelo

El sistema SHALL permitir al OPERADOR_LOGISTICO eliminar un vuelo mediante `DELETE /api/vuelos/{id}`.

Solo se permite eliminar vuelos con estado `PROGRAMADO`.

No SHALL permitir eliminar un vuelo que tenga equipajes asignados.

#### Scenario: Eliminar vuelo exitosamente
- **WHEN** un OPERADOR_LOGISTICO envía DELETE /api/vuelos/{id} con un vuelo PROGRAMADO sin equipajes asignados
- **THEN** el sistema elimina el vuelo y responde 204 No Content

#### Scenario: Eliminar vuelo con equipajes asignados
- **WHEN** un OPERADOR_LOGISTICO envía DELETE /api/vuelos/{id} con un vuelo que tiene equipajes
- **THEN** el sistema responde 422 con error VALIDACION

#### Scenario: Eliminar vuelo no PROGRAMADO
- **WHEN** un OPERADOR_LOGISTICO envía DELETE /api/vuelos/{id} con un vuelo EN_RUTA
- **THEN** el sistema responde 422 con error VALIDACION

### Requirement: Frontend — Botón "Nuevo Vuelo"

El frontend SHALL mostrar un botón "Nuevo Vuelo" al lado del botón "Individual".

El formulario SHALL incluir campos: código, origen (select de nodos), destino (select de nodos), hora salida, hora llegada, capacidad de carga.

### Requirement: Frontend — Botones editar/eliminar en lista de vuelos

El frontend SHALL mostrar botones editar/eliminar en cada vuelo de la lista, solo para vuelos con estado `PROGRAMADO`.

- Editar SHALL llamar `api.put(/vuelos/${id}, data)`.
- Eliminar SHALL llamar `api.delete(/vuelos/${id})`.
