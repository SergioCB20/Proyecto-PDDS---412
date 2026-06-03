## ADDED Requirements

### Requirement: Frontend envía archivo CSV al backend
El frontend SHALL enviar el archivo CSV seleccionado por el usuario a `POST /equipajes/carga-masiva` mediante `multipart/form-data` en lugar de procesarlo localmente.

#### Scenario: Usuario selecciona archivo CSV válido
- **WHEN** el usuario selecciona un archivo `.csv` en el modal de carga masiva
- **THEN** el frontend crea un `FormData` con el campo `archivo` y lo envía a `POST /equipajes/carga-masiva`
- **THEN** el frontend recibe la respuesta `PreviewResponse` del backend y la muestra en el modal

#### Scenario: Error al enviar archivo
- **WHEN** el backend rechaza el archivo (vacío, sin cabecera, formato inválido)
- **THEN** el frontend muestra el mensaje de error del backend en el modal

### Requirement: Preview mostrado desde respuesta del backend
El frontend SHALL mostrar el preview de carga masiva usando la estructura `PreviewResponse` del backend (`total`, `validos`, `con_revision`, `registros[]`).

#### Scenario: Preview con registros válidos y con revisión
- **WHEN** el frontend recibe el `PreviewResponse` del backend
- **THEN** el frontend muestra el total de registros, el conteo de válidos y el conteo de "con revisión"
- **THEN** el frontend agrupa los registros por `estado_validacion` (`VALIDO` / `REVISION`) y los muestra en tablas separadas
- **THEN** para registros en `REVISION`, el frontend muestra el campo `motivo` con la descripción del error

### Requirement: Payload de confirmación correcto
El frontend SHALL enviar a `POST /equipajes/carga-masiva/confirmar` únicamente `{ ids_equipaje: ["MAL-001", ...] }`, extrayendo los `id_equipaje` de los registros válidos.

#### Scenario: Confirmación exitosa
- **WHEN** el usuario hace clic en "Confirmar"
- **THEN** el frontend extrae los `id_equipaje` de los registros con `estado_validacion === "VALIDO"`
- **THEN** el frontend envía `{ ids_equipaje: [...] }` a `POST /equipajes/carga-masiva/confirmar`
- **THEN** el frontend cierra el modal y refresca los datos

#### Scenario: Error al confirmar
- **WHEN** el backend rechaza la confirmación (preview expirado, etc.)
- **THEN** el frontend muestra el mensaje de error del backend

### Requirement: SLA convertido a ISO 8601
El frontend SHALL convertir el SLA de horas (número entero) a formato ISO 8601 antes de enviarlo al backend.

#### Scenario: Conversión de SLA
- **WHEN** el frontend procesa el CSV y obtiene el SLA en horas
- **THEN** el frontend calcula `fecha_actual + SLA_horas` y lo convierte a string ISO 8601
- **THEN** el ISO 8601 se envía en el campo `sla_comprometido`
