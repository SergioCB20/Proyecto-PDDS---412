## MODIFIED Requirements

### Requirement: GET /api/eventos/planificacion

El endpoint SHALL aceptar opcionalmente el query param `token` para autenticación vía URL, además del header `Authorization`.

Si se provee `token`, el servidor SHALL validar el JWT y verificar que el rol sea `OPERADOR_LOGISTICO` antes de establecer la conexión SSE. Si el token es inválido o el rol no es el correcto, SHALL responder con error 401 o 403 respectivamente.
