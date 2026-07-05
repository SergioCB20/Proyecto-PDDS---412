## Why

Actualmente el panel de envíos permite seguir el vuelo que transporta una maleta individual (task anterior), pero no hay forma de visualizar la ruta completa que sigue un grupo de maletas (identificado por `codigo_equipaje`). El operador necesita ver en el mapa todos los segmentos del plan de viaje —origen, vuelos de conexión, escalas y destino final— para entender la trayectoria completa del grupo, no solo el vuelo actual.

## What Changes

- Se agrega un botón "Mostrar ruta" (icono `Route`) por cada fila de envío en los paneles `PanelEnviosOperacion` (operación) y `PanelEnvios` (simulación/colapso).
- Al pulsar el botón, el frontend consulta `GET /api/equipajes/{id}/plan-viaje` para obtener los segmentos del plan de viaje.
- Se dibuja una polyline en el mapa conectando todos los aeropuertos de la ruta (origen → segmento1 → segmento2 → ... → destino).
- Los vuelos involucrados en la ruta se resaltan visualmente (glow, trail más grueso) en el mapa.
- La cámara del mapa ajusta zoom (`fitBounds`) para mostrar la ruta completa.
- Al pulsar ESC o un botón "Cerrar ruta", se limpia el resalte.
- No hay cambios de backend: el endpoint `GET /api/equipajes/{id}/plan-viaje` ya existe y retorna los segmentos.

## Capabilities

### New Capabilities
- `mostrar-ruta-grupo-maletas`: Botón por fila de envío que dibuja una polyline en el mapa con la ruta completa del plan de viaje y resalta los vuelos involucrados.

### Modified Capabilities
- *(ninguna — no se modifican requisitos de capacidades existentes)*

## Impact

- **Frontend**: Modificaciones en `types.ts` (nuevo tipo `RutaDestacada`), `GeoMapa.tsx` (Polyline + fitBounds), `GeoMapaVuelo.tsx` y `AvionAnimado.tsx` (prop `destacado`), `PanelEnviosOperacion.tsx`, `PanelEnvios.tsx`, y `page.tsx` (tres vistas).
- **Backend**: Sin cambios.
- **API**: Se consume el endpoint existente `GET /equipajes/{id}/plan-viaje` (JSON). No hay endpoints nuevos.
- **Dependencias**: `lucide-react` (icono `Route` + `Loader2`) — ya disponibles en el proyecto.
