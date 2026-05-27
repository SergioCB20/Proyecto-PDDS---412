## MODIFIED Requirements

### Requirement: Frontend muestra errores de conexión al usuario

El frontend DEBE mostrar un mensaje de error visible cuando no puede comunicarse con el backend o cuando el backend rechaza la solicitud. NO DEBE silenciar errores con datos mock.

#### Scenario: Backend no disponible

- **GIVEN** la página de operación intenta cargar datos
- **WHEN** el backend no responde (servidor caído, red caída, CORS)
- **THEN** el frontend NO mustra datos mock como fallback
- **THEN** el frontend muestra un banner rojo con el mensaje: "Error de conexion con el servidor"
- **THEN** el frontend continúa el polling cada 5s para reconectar automáticamente

#### Scenario: Usuario sin permisos (403)

- **GIVEN** un usuario sin rol `OPERADOR_LOGISTICO` navega a `/operacion`
- **WHEN** el frontend intenta `GET /api/nodos` o `POST /api/equipajes`
- **THEN** el frontend muestra el mensaje de error del backend (ej. "Acceso denegado")
- **THEN** el frontend NO mustra datos mock

#### Scenario: Polling exitoso después de error

- **GIVEN** la página muestra un banner de error por desconexión
- **WHEN** el polling detecta que el backend responde nuevamente
- **THEN** el frontend actualiza los datos y oculta el banner de error
- **THEN** el frontend muestra la última hora de actualización
