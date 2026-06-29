## Context

Actualmente los módulos de operación y simulación muestran envíos de maletas en paneles contextuales (envíos de un vuelo específico o de un nodo/aeropuerto específico) y un panel separado de entregados recientes. No existe una vista global que unifique los tres estados (planificados, en vuelo, entregados) con filtros por origen y destino.

## Goals / Non-Goals

**Goals:**
- Proveer endpoints REST que devuelvan listas de maletas agrupadas por tipo (planificados, en vuelo, entregados) con filtros opcionales por origen y destino.
- Proveer un componente frontend reutilizable (PanelEnviosMaletas) con 3 tabs y filtros.
- Integrar el panel en las vistas OperacionView, SimulacionView y ColapsoView.

**Non-Goals:**
- No modificar endpoints existentes ni cambiar el comportamiento actual.
- No agregar nuevas tablas ni migraciones de base de datos.
- No modificar el comportamiento de WebSocket o telemetría.

## Decisions

1. **Nuevos endpoints dedicados vs. composición desde el frontend**
   - Se crean nuevos endpoints (`GET /api/equipajes/envios-panel` y `GET /api/sesiones/{id}/envios/envios-panel`) en lugar de componer múltiples llamadas desde el frontend, para evitar N+1 requests y centralizar la lógica de obtención del código de vuelo asociado.

2. **Un solo componente compartido vs. componentes duplicados**
   - Se crea un único `PanelEnviosMaletas` que acepta `sesionId` opcional. Si `sesionId` es null usa las APIs de operación; si se proporciona usa las APIs de sesión. Esto evita la duplicación que existe en otros paneles (ej. PanelEnvios vs PanelEnviosOperacion).

3. **Código de vuelo: lookup desde PlanViaje**
   - Para maletas en estado EN_VUELO se usa `vueloActual.codigoVuelo`.
   - Para REGISTRADO/ENRUTADO/EN_ALMACEN se obtiene del primer segmento del PlanViaje (si existe).
   - Para ENTREGADO se obtiene del último segmento completado (misma lógica que `obtenerEntregadosRecientes`).

4. **Polling cada 5s vs. WebSocket**
   - Se usa polling con `setInterval` de 5s (mismo patrón que PanelEntregados) para mantener el panel actualizado cuando la sesión está activa.

## Risks / Trade-offs

- [Rendimiento] El nuevo endpoint puede ser pesado si hay muchas maletas. → Se limita a 100 resultados por tipo.
- [Consistencia] El código de vuelo para maletas planificadas puede no estar disponible si aún no tienen ruta asignada. → Se muestra vacío en ese caso.
