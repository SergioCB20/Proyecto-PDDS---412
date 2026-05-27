## ADDED Requirements

### Requirement: Consumir eventos SSE de planificación

El frontend SHALL conectar a `GET /api/eventos/planificacion?token={jwt}` usando la API `EventSource` del navegador al cargar la página de operación.

La conexión SHALL usar el token JWT almacenado en `localStorage` como query param `token`.

#### Scenario: Conexión SSE exitosa
- **WHEN** la página de operación se carga y hay un token JWT válido
- **THEN** el frontend abre un EventSource a `/api/eventos/planificacion?token=...` y el indicador de estado SSE muestra "conectado"

#### Scenario: Reconexión automática
- **WHEN** la conexión SSE se pierde (error de red, reinicio del servidor)
- **THEN** el frontend cierra el EventSource anterior, espera 3 segundos y reconecta automáticamente

### Requirement: Mostrar notificación al recibir planificacion-completada

El frontend SHALL escuchar el evento `planificacion-completada` del SSE.

Al recibirlo, SHALL:
- Parsear el payload JSON (`equipaje_id`, `tipo`, `estado`, `plan_viaje`)
- Mostrar una notificación toast verde con el mensaje "Equipaje {id} planificado ({tipo})"
- Agregar el equipaje a la lista de equipajes recientes con estado ENRUTADO

#### Scenario: Notificación de planificación completada
- **WHEN** el backend emite un evento `planificacion-completada` con equipaje_id y tipo
- **THEN** el frontend muestra un toast verde con el mensaje y actualiza la lista de equipajes

### Requirement: Mostrar notificación al recibir planificacion-fallida

El frontend SHALL escuchar el evento `planificacion-fallida` del SSE.

Al recibirlo, SHALL:
- Parsear el payload JSON (`equipaje_id`, `error`)
- Mostrar una notificación toast roja con el mensaje de error

#### Scenario: Notificación de planificación fallida
- **WHEN** el backend emite un evento `planificacion-fallida` con un mensaje de error
- **THEN** el frontend muestra un toast rojo con el mensaje de error

### Requirement: Botón "Ver Reporte" en sesión finalizada

El frontend SHALL mostrar un botón "Ver Reporte" en la página de detalle de simulación cuando el estado de la sesión sea `FINALIZADA`.

El botón SHALL navegar a `/simulacion/{id}/reporte`.

#### Scenario: Botón visible al finalizar
- **WHEN** la simulación cambia a estado FINALIZADA
- **THEN** el frontend muestra un botón "Ver Reporte" en lugar del texto "Simulacion finalizada"
- **WHEN** el usuario hace clic en el botón
- **THEN** el frontend navega a `/simulacion/{id}/reporte`
