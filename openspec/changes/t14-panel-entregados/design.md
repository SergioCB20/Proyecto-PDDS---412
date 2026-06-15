## Context

La vista `simulacion/[id]/page.tsx` ya renderiza múltiples paneles en la barra lateral derecha (`PanelNodos`, `PanelVuelos`, `PanelEnvios`). El backend ya implementa el endpoint `GET /api/sesiones/{id}/envios/entregados-recientes?horas=4` que devuelve equipajes con estado `ENTREGADO` filtrados por ventana de tiempo virtual. El frontend no consume este endpoint ni muestra la información.

## Goals / Non-Goals

**Goals:**
- Mostrar una lista actualizable de equipajes entregados en las últimas 4h virtuales
- Seguir el patrón existente de `PanelEnvios.tsx` (props, estados, fetching)
- Polling automático mientras la sesión esté `EN_CURSO`
- Usar el endpoint B4 ya existente en el backend

**Non-Goals:**
- No modificar el backend
- No agregar filtros ni ordenamiento al panel (solo lista plana)
- No agregar WebSocket para este panel (polling es suficiente)

## Decisions

1. **Polling vs WebSocket**: Se usa `setInterval` con fetch cada 5s (mismo patrón que `fetchMetricas` en la página) en lugar de WebSocket, para mantener consistencia con el resto de paneles y porque el endpoint B4 ya existe como REST.

2. **Componente independiente vs integrado en PanelEnvios**: Se crea un componente separado `PanelEntregados` porque tiene su propia lógica de fetching (no depende de `selectedEnvio`), su propio endpoint, y un propósito visual distinto.

3. **Type separado**: Se define `EnvioEntregadoResponse` en `types.ts` con `codigo_vuelo` en lugar de reusar `EnvioItemResponse` que tiene `codigo_equipaje`, porque el backend devuelve una estructura diferente.

## Risks / Trade-offs

- **Polling cada 5s con sesiones largas**: Múltiples requests GET. El endpoint es liviano (solo consulta equipajes entregados recientes), pero en sesiones de horas podría acumular cientos de requests. → Mitigación: el polling se detiene automáticamente al finalizar la sesión.
- **Duplicación con WebSocket**: Las métricas ya llegan por WebSocket, pero los entregados-recientes no están incluidos en el mensaje de telemetría. → Trade-off aceptable.
