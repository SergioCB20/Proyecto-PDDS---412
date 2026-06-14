## Why

La vista de simulación en vivo (`/simulacion/[id]`) necesita mostrar los envíos (equipajes) asociados a vuelos, nodos y entregas recientes dentro del estado virtual actual de la simulación. Actualmente no existen endpoints que expongan esta información desde el motor de simulación, bloqueando las tareas frontend T13 (click nodo/vuelo → mostrar envíos) y T14 (panel últimos envíos entregados).

## What Changes

- **B2** — Nuevo endpoint `GET /api/sesiones/{id}/envios/vuelo/{vueloId}` que devuelve los equipajes asignados actualmente a un vuelo dentro de una sesión.
- **B3** — Nuevo endpoint `GET /api/sesiones/{id}/envios/nodo/{nodoIata}` que devuelve los equipajes almacenados actualmente en un nodo dentro de una sesión.
- **B4** — Nuevo endpoint `GET /api/sesiones/{id}/envios/entregados-recientes?horas=4` que devuelve equipajes con estado `ENTREGADO` en las últimas N horas virtuales.

## Capabilities

### New Capabilities
- `envios-simulacion`: Endpoints de consulta de equipajes en estado virtual de simulación, filtrados por vuelo, nodo o ventana de tiempo.

### Modified Capabilities
<!-- No existing specs need modification — this is purely additive -->

## Impact

- **Backend:** 3 nuevos endpoints en `SesionController.java` + 3 nuevos métodos en `SesionService.java` + nuevas queries en repositorios + 2 nuevos DTOs record.
- **API:** 3 nuevas rutas bajo `/api/sesiones/{id}/envios/*`.
- **Frontend:** Consumirá estos endpoints desde los componentes `PanelEnvios` y `PanelEntregados`.
- **Base de datos:** Sin migraciones. Los datos se leen del estado persistido por `TickService`.
