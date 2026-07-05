## Why

Actualmente el panel "Envíos de Maletas" muestra datos agrupados de maletas en vuelo pero no permite localizar una maleta específica por su código ni seguir visualmente la ruta de un grupo de maletas en el mapa. Los operadores y analistas necesitan estas capacidades para rastrear maletas individuales y visualizar su trayectoria.

## What Changes

- Se agrega un **filtro de búsqueda por código de maleta** (`codigo_equipaje`) en los endpoints `GET /api/equipajes/envios-panel` y `GET /api/sesiones/{id}/envios/envios-panel`, con búsqueda parcial (LIKE) sobre `id_externo`
- Se agrega un **input de texto "Código maleta"** en el componente `PanelEnviosMaletas` junto a los filtros existentes de origen y destino
- Se agregan **botones "Seguir en mapa" (MapPin) y "Mostrar ruta" (Route)** por cada fila en la lengüeta "En Vuelo", siguiendo el mismo patrón de `PanelEnviosOperacion` y `PanelEnvios`
- Se pasa `onSeguirEnMapa` y `onMostrarRuta` desde `PanelTabs` hasta `PanelEnviosMaletas`
- Se cablean los handlers en las 3 vistas (OperacionView, SimulacionView, ColapsoView) en `page.tsx`
- No hay cambios rompientes (backwards compatible)

## Capabilities

### New Capabilities
_Ninguna — todos los cambios son modificaciones a la capability existente `envios-panel`._

### Modified Capabilities
- `envios-panel`: Se agrega filtro `codigo_equipaje` a los endpoints API (consulta LIKE sobre `id_externo`). Se agregan botones de seguimiento en mapa y visualización de ruta en la lengüeta "En Vuelo" del componente `PanelEnviosMaletas`, con los correspondientes props de callback.

## Impact

- **Backend**: `EquipajeController`, `SesionController`, `EquipajeService`, `SesionService`, `EquipajeRepository` — agregar parámetro `codigo_equipaje` a los endpoints y modificar la query JPQL
- **Frontend**: `PanelEnviosMaletas.tsx` — nuevo input de filtro y botones por fila; `PanelTabs.tsx` — nuevos props de callback; `page.tsx` — cableado en las 3 vistas; `lib/api.ts` — nuevo parámetro en funciones `fetchEnviosPanel` y `fetchEnviosPanelSesion`
