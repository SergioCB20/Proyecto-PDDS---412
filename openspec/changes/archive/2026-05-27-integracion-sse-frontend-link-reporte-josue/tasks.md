## 1. Backend — Autenticación SSE por query param

- [x] 1.1 Inyectar `JwtUtil` en `PlanificacionSseController.java`
- [x] 1.2 Agregar `@RequestParam(required = false) String token` al método `suscribirPlanificacion()`
- [x] 1.3 Validar token JWT con `jwtUtil.esTokenValido()` — si inválido, responder 401
- [x] 1.4 Validar rol con `jwtUtil.extraerRol()` — si no es OPERADOR_LOGISTICO, responder 403
- [x] 1.5 Remover `@PreAuthorize` (la validación ahora es manual)
- [x] 1.6 Verificar que el backend compile

## 2. Frontend — Consumo SSE en operación

- [x] 2.1 Agregar estado `sseConnected` y `notificaciones` en `operacion/page.tsx`
- [x] 2.2 Agregar función `agregarNotificacion(tipo, mensaje)` con auto-descarte a 5s
- [x] 2.3 Agregar `useEffect` que crea `EventSource` con token JWT como query param
- [x] 2.4 Escuchar evento `planificacion-completada` → mostrar toast verde y actualizar lista de equipajes
- [x] 2.5 Escuchar evento `planificacion-fallida` → mostrar toast rojo con mensaje de error
- [x] 2.6 Manejar `onerror` → cerrar conexión, esperar 3s, reconectar
- [x] 2.7 Agregar indicador visual de estado SSE (conectado/desconectado) en el sidebar
- [x] 2.8 Agregar área de notificaciones toast en el sidebar

## 3. Frontend — Botón "Ver Reporte"

- [x] 3.1 Agregar import de `FileText` de lucide-react en `simulacion/[id]/page.tsx`
- [x] 3.2 Reemplazar texto "Simulacion finalizada" por un `Button` "Ver Reporte" que navegue a `/simulacion/{id}/reporte`

## 4. Verificación

- [x] 4.1 Verificar que el frontend compile sin errores
- [x] 4.2 Verificar que el backend compile sin errores
