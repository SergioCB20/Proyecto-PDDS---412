## Why

La vista de simulación (`/simulacion/[id]`) no renderiza correctamente los nodos de aeropuertos ni los aviones en el mapa interactivo, lo que impide al analista visualizar el estado de la simulación en tiempo real. El backend envía datos de telemetría correctamente, pero el frontend no mapea los colores de nodos a valores CSS válidos y el componente de vuelos ignora el estado de animación activa.

## What Changes

- **C4 — Archivar como completado**: Marcar las 3 subtareas de C4 como `[x]` en el archivo de tareas archivadas (`matchEstadoVuelo` ya implementado y en uso)
- **Fix colores de nodos en simulación**: Mapear los valores `"VERDE"`, `"AMBAR"`, `"ROJO"` que envía el backend por WebSocket a colores CSS hex válidos (`#22c55e`, `#eab308`, `#ef4444`) al construir `NodoEnMapa[]` en la página de simulación
- **Fix animación de vuelos en mapa**: Utilizar el prop `animacionActiva` en `GeoMapaVuelo` para controlar el comportamiento visual de los marcadores de aviones según el estado de la simulación
- **Indicador de conexión WebSocket**: Mostrar visualmente si el WebSocket de telemetría está conectado para que el analista sepa si los datos están fluyendo

## Capabilities

### New Capabilities
- `mapa-telemetria`: Renderizado de nodos y vuelos en el mapa interactivo de simulación usando datos del WebSocket de telemetría, con colores CSS válidos y animación condicional

### Modified Capabilities
- Ninguna. Los cambios son solo de implementación frontend, no alteran contratos API ni requisitos de especificaciones existentes.

## Impact

- `frontend/app/simulacion/[id]/page.tsx` — mapeo de colores de nodos
- `frontend/components/mapa/GeoMapaVuelo.tsx` — uso de prop `animacionActiva`
- `frontend/components/mapa/GeoMapaNodo.tsx` — sin cambios (recibe colores ya mapeados)
- `openspec/changes/archive/2026-06-02-implementar-c4/tasks.md` — marcar tareas como `[x]`
- No afecta APIs, dependencias, ni otros bounded contexts
