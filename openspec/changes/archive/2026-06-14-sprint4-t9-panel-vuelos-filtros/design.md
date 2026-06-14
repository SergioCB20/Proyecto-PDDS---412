## Context

La vista de simulación en vivo (`/simulacion/[id]/page.tsx`) renderiza actualmente un listado plano de vuelos en la sección "Ocupación de Vuelos" (líneas 420–456) sin capacidad de filtrado. Los datos llegan vía WebSocket a través del hook `useTelemetria` como `VueloTelemetria[]`. Existe ya un componente `ResumenVuelos` que muestra una agregación por nodo, pero el listado detallado no ofrece filtros.

Los componentes `Input` y `Select` de `components/ui/` están disponibles y siguen el patrón de diseño del proyecto. La rama de trabajo es `frontend/sprint4-simulacion-mejoras`.

## Goals / Non-Goals

**Goals:**
- Crear un componente `PanelVuelos` autónomo y reutilizable
- Permitir filtrar vuelos por código (texto libre), origen IATA (select) y destino IATA (select)
- Reemplazar la sección "Ocupación de Vuelos" actual por el nuevo panel
- Mantener consistencia visual con el diseño existente

**Non-Goals:**
- No modificar `ResumenVuelos` (se mantiene como agregación por nodo)
- No agregar ordenamiento (es tarea T10 independiente)
- No afectar el mapa ni los nodos
- No cambiar la lógica de telemetría ni fetching de datos

## Decisions

1. **Componente autónomo con estado interno** en vez de estado en `page.tsx`:
   - El `PanelVuelos` recibe `vuelos: VueloTelemetria[]` como prop y maneja sus propios estados de filtro (`useState`) y derivación (`useMemo`)
   - Mantiene `page.tsx` limpio y facilita pruebas unitarias
   - Sigue el patrón de componentes autónomos usado en `ResumenVuelos`

2. **Selects en vez de inputs de texto** para origen y destino:
   - Se derivan opciones únicas de `origen_iata` y `destino_iata` mediante `useMemo`
   - Reduce errores de tipeo y ofrece UX más rápida
   - Incluyen opción "Todas" para limpiar el filtro

3. **Input de texto** para código de vuelo:
   - Búsqueda parcial case-insensitive con `includes`
   - Más flexible que un select (los códigos son muchos y variados)

4. **Botón "Limpiar filtros"** visible solo cuando hay filtros activos:
   - UX clara: el usuario sabe que puede resetear
   - Sigue patrón común de paneles de búsqueda

5. **Mantener el mismo estilo visual** del listado actual:
   - Reutiliza las mismas clases Tailwind (fondos, bordes, tipografía)
   - Misma estructura de card por vuelo (código, ruta, barra de ocupación)
   - Consistencia con el diseño del sidebar derecho

## Risks / Trade-offs

- **Filtros sobre datos de telemetría solamente:** Si la simulación no está activa (`telemetria?.vuelos` vacío), el panel no muestra nada. Esto es coherente con el comportamiento actual.
- **Selects de origen/destino dinámicos:** Si cambian los vuelos vía WebSocket, las opciones se actualizan automáticamente gracias a `useMemo`.
- **Rendimiento:** La lista filtrada se recalcula en cada cambio de filtro o actualización de telemetría. Con `useMemo` y `filter` simple es O(n) y no debería ser problema con decenas de vuelos.
