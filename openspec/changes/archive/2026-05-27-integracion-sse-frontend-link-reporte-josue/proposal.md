## Why

El backend ya emite eventos SSE de planificación (`planificacion-completada`/`planificacion-fallida`) pero el frontend no los consume, por lo que el operador no recibe notificaciones en tiempo real cuando un equipaje es planificado o falla. Además, la página de reporte de simulación ya existe pero no hay forma de navegar a ella desde la vista de detalle de simulación. Estas dos carencias impiden que el usuario tenga visibilidad inmediata del estado de las operaciones.

## What Changes

1. **Autenticación SSE por query param** — Modificar `PlanificacionSseController` para aceptar `?token=` como query param, ya que `EventSource` no soporta headers personalizados. Validar JWT y rol manualmente.
2. **Consumo SSE en frontend** — En `operacion/page.tsx`: abrir `EventSource` con token, escuchar eventos `planificacion-completada` y `planificacion-fallida`, mostrar notificaciones toast y actualizar lista de equipajes. Reconexión automática cada 3s en caso de error.
3. **Botón "Ver Reporte"** — En `simulacion/[id]/page.tsx`: cuando estado = FINALIZADA, mostrar botón que navega a `/simulacion/[id]/reporte`.

## Capabilities

### New Capabilities
- `sse-frontend-consumo`: Consumo de eventos SSE de planificación desde el frontend de operaciones.

### Modified Capabilities
- `api-contracts`: El endpoint `GET /api/eventos/planificacion` ahora acepta `?token=` como query param adicional al header Authorization.

## Impact

- **Backend**: `PlanificacionSseController.java` — agregar dependencia de `JwtUtil`, validar token y rol desde query param.
- **Frontend**: `app/operacion/page.tsx` — agregar conexión SSE, notificaciones toast, indicador de estado de conexión. `app/simulacion/[id]/page.tsx` — agregar botón "Ver Reporte".
