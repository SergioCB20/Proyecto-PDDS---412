## Context

- Sprint 4, T13 del Developer 2 (Josue). Backend endpoints B2 y B3 ya están implementados y compilados (`GET /api/sesiones/{id}/envios/vuelo/{vueloId}` y `GET /api/sesiones/{id}/envios/nodo/{nodoIata}`).
- `PanelVuelos` y `PanelNodos` existen y se renderizan en el sidebar de `/simulacion/[id]`.
- El sidebar ya tiene scroll y múltiples secciones (métricas, resumen, paneles, botones de control).

## Goals / Non-Goals

**Goals:**
- Permitir al analista hacer clic en cualquier vuelo del `PanelVuelos` o nodo del `PanelNodos` para ver los envíos asociados.
- Los envíos se muestran en un subpanel inline (`PanelEnvios`) dentro del sidebar, sin ocultar los paneles originales.

**Non-Goals:**
- No se modifica el mapa ni los popups de Leaflet (T3 ya cubre popups de vuelo en el mapa).
- No se implementa T14 (panel de entregados recientes) — es tarea separada.
- No se modifican endpoints backend.

## Decisions

| Decisión | Opción elegida | Alternativas consideradas | Razón |
|----------|---------------|--------------------------|-------|
| **Arquitectura del subpanel** | Componente `PanelEnvios` separado en `page.tsx`, renderizado condicionalmente | Subpanel auto-contenido dentro de cada panel | Reusable: mismo componente sirve para vuelo y nodo. Menos duplicación. |
| **Estado de selección** | `selectedEnvio` en `SimulacionContent` (`page.tsx`) | Estado local en cada panel | El padre orquesta qué se muestra; evita sincronización entre componentes hermanos. |
| **Posición en sidebar** | Debajo de `PanelVuelos` y `PanelNodos`, como sección adicional | Reemplazar el panel clickeado | No interrumpe la navegación; el usuario puede ver el subpanel y los paneles simultáneamente. |
| **Fetch de datos** | `useEffect` en `PanelEnvios` disparado por cambio en `selectedEnvio` | Fetch en el padre y pasar data como prop | Mantiene la lógica de carga dentro del componente que la necesita. Simple y auto-contenido. |
| **Estilo visual** | Misma paleta que `PanelVuelos`/`PanelNodos`: fondos `slate-50`, texto `text-xs`, scroll `max-h-56` | Estilo propio | Consistencia visual con el resto del sidebar. |

## Risks / Trade-offs

- **[Rendimiento]** Si hay muchos equipajes (>100), la lista podría ser larga. → Se mitiga con `max-h-56` y scroll.
- **[UX]** El subpanel aparece al final del sidebar; si el sidebar tiene mucho scroll, el usuario podría no verlo inmediatamente. → Se podría hacer scroll automático (`scrollIntoView`) al subpanel cuando se abre.
- **[Dependencia]** T13 depende de B2/B3 funcionando en backend. Si el backend no está corriendo, el subpanel mostrará error. → Ya implementados, bajo riesgo.
