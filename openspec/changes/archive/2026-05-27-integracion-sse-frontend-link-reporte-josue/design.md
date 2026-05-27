## Context

El backend tiene un sistema SSE completo (B12): `SseService` gestiona emisores, `PlanificacionSseController` expone `GET /api/eventos/planificacion`, y `PlanificacionWorker` emite eventos `planificacion-completada` y `planificacion-fallida`. Sin embargo, el frontend no consume estos eventos.

El endpoint SSE actual usa `@PreAuthorize("hasRole('OPERADOR_LOGISTICO')")` que depende del header `Authorization`. La API `EventSource` del navegador no permite enviar headers personalizados, por lo que no puede autenticarse.

La página de reporte (`simulacion/[id]/reporte/page.tsx`) ya existe con UI completa (gráfico de evolución SLA, tarjetas de resumen) y fallback a mock data, pero no tiene un enlace desde la página de detalle de simulación.

## Goals / Non-Goals

**Goals:**
- Permitir que `EventSource` se autentique contra el endpoint SSE usando el token JWT.
- Consumir eventos SSE en `operacion/page.tsx` y mostrar notificaciones en tiempo real.
- Agregar botón "Ver Reporte" en `simulacion/[id]/page.tsx` cuando la sesión esté finalizada.

**Non-Goals:**
- No se modifica el mecanismo de broadcast SSE del backend (sigue siendo global).
- No se implementan sesiones SSE por usuario — todos los operadores reciben los mismos eventos.
- No se modifica la lógica de generación de reportes (B8 sigue pendiente).

## Decisions

1. **Token por query param en SSE**: Se agrega `@RequestParam(required = false) String token` al endpoint SSE. Si se provee, se valida manualmente el JWT y el rol. Alternativa considerada: usar `EventSource` con polyfill que soporte headers. Se descartó porque introduce una dependencia adicional y el approach de query param ya se usa para WebSocket (`ws://host/api/ws/telemetria?token={jwt}`).

2. **Notificaciones toast**: Se usa un estado local `notificaciones` con auto-descarte a los 5 segundos, en lugar de una librería externa de toasts. Alternativa considerada: `react-hot-toast` o similar. Se descartó para evitar dependencias adicionales.

3. **Mock fallback para reporte**: El botón "Ver Reporte" navega a la página de reporte que ya tiene fallback a `MOCK_REPORTE_SESION`. Esto permite que C6 funcione incluso sin B8 completo en backend.

## Risks / Trade-offs

- [Token en URL] El token JWT queda expuesto en logs del servidor y en el historial del navegador. Mitigación: el token tiene expiración (configurable via `jwt.expiration`). El endpoint SSE solo es accesible vía HTTPS en producción.
- [Reconexión SSE] Si el servidor se reinicia, todos los clientes SSE se reconectan simultáneamente. Mitigación: el `EventSource` nativo ya maneja reconexión automática; se agrega un delay de 3s antes de reconectar para evitar thundering herd.
