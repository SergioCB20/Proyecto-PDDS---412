## Context

La vista de simulación (`/simulacion/[id]`) usa `GeoMapa` (Leaflet) para mostrar nodos aeroportuarios y vuelos en tiempo real vía WebSocket. Actualmente:

- Los nodos reciben colores como strings `"VERDE"`, `"AMBAR"`, `"ROJO"` desde el backend (`TelemetriaService`), pero Leaflet espera colores CSS válidos. Esto causa que `CircleMarker` no renderice los nodos.
- El componente `GeoMapaVuelo` recibe el prop `animacionActiva` pero no lo utiliza, por lo que no hay diferenciación visual cuando la simulación está corriendo.
- El hook `useTelemetria` maneja la reconexión automática, pero no hay indicador visible de conexión para el usuario.

## Goals / Non-Goals

**Goals:**
- Nodos de aeropuertos visibles en el mapa de simulación con colores CSS válidos según el nivel de ocupación
- Aviones visibles en el mapa con posición interpolada desde WebSocket
- Diferenciación visual cuando la simulación está activa vs pausada
- Indicador de conexión WebSocket visible para el analista

**Non-Goals:**
- No se modifica la lógica del backend (`TelemetriaService`, `TelemetriaWebSocket`)
- No se modifican las vistas de operación (`operacion/page.tsx`)
- No se modifica el contrato de tipos (`types.ts`)
- No se agregan nuevas dependencias externas

## Decisions

### D1: Mapeo inline en la página de simulación (vs función compartida)
**Decisión:** Agregar constante `COLOR_NODO_MAP` directamente en `simulacion/[id]/page.tsx` con `as const`.
**Razón:** La vista de operación usa `getNodoColor()` de `mock.ts` que calcula el color desde ocupación numérica. El WebSocket ya envía el color como string semántico (`"VERDE"`), por lo que solo necesitamos un mapeo simple de 3 entradas. Ponerlo inline evita acoplamiento con `mock.ts` y mantiene el código localizado. Si en el futuro se necesita reutilizar, se extrae a `lib/colors.ts`.

Alternativa considerada: Extraer a `lib/colors.ts`. Se descartó porque agregar un archivo para 3 líneas de mapeo es over-engineering.

### D2: GeoMapaVuelo usa animacionActiva para opacidad/línea
**Decisión:** Cuando `animacionActiva === false` (simulación pausada/configurada), el marcador del avión y la línea de ruta se renderizarán con opacidad reducida (0.4). Cuando `animacionActiva === true`, opacidad completa (1.0).
**Razón:** Es un cambio mínimo que da feedback visual inmediato al analista sobre si la simulación está activa. No requiere animaciones complejas ni librerías adicionales.

### D3: Indicador WebSocket en panel lateral
**Decisión:** Mostrar un indicador (punto verde/rojo + texto "Telemetría conectada/desconectada") en el panel lateral de métricas, similar al indicador SSE de la vista de operación.
**Razón:** El hook `useTelemetria` ya expone `connected`. Solo es cuestión de renderizarlo. Da visibilidad inmediata al analista sobre el estado de la conexión en tiempo real.

## Risks / Trade-offs

- **[Bajo] Nodos sin datos de telemetría**: Si el WebSocket no está conectado, `telemetria?.nodos` es `[]` y no se renderiza nada. Esto es comportamiento esperado — el indicador de conexión ayuda a diagnosticarlo.
- **[Bajo] Cambio en backend de nombres de color**: Si el backend cambia `"VERDE"` a `"GREEN"`, el mapeo fallaría. Mitigación: el mapeo tiene un fallback a `#6b7280` (gris) para cualquier valor no reconocido.
- **[Medio] Leaflet no refresca marcadores**: React-Leaflet a veces no actualiza el `CircleMarker` si cambian solo las `pathOptions`. Mitigación: usar `key` prop con `nodo.codigo_iata` + `nodo.color` para forzar recreación cuando cambia el color.
