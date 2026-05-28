## MODIFIED Requirements

### Requirement: Frontend muestra éxito al crear equipaje sin crashear

El frontend SHALL mostrar un mensaje de éxito al crear un equipaje usando únicamente los campos que retorna `POST /api/equipajes`: `id`, `estado`, `id_externo`, `destino_iata`. El frontend NO DEBE asumir la presencia del campo `plan_viaje` en la respuesta.

#### Scenario: Creación exitosa de equipaje individual

- **GIVEN** el operador logístico completa el formulario "Registrar Equipaje" con datos válidos
- **WHEN** el frontend envía `POST /api/equipajes` y recibe `{ id, estado, id_externo, destino_iata }`
- **THEN** el frontend muestra un banner verde con "Equipaje registrado", el `id` y el `estado`
- **THEN** el frontend NO intenta acceder a `plan_viaje` ni a sus subcampos
- **THEN** el frontend agrega el equipaje a la lista de equipajes recientes

#### Scenario: Error de validación del backend

- **GIVEN** el operador logístico completa el formulario con datos inválidos (destino IATA inexistente, vuelo no encontrado, capacidad agotada)
- **WHEN** el backend responde con `422 Unprocessable Entity` y un mensaje de error
- **THEN** el frontend muestra el mensaje de error del backend en un banner rojo debajo del formulario
- **THEN** el frontend NO muestra el mensaje de éxito
