## Why

Tarea C2 del backlog de frontend requiere un formulario de registro de equipaje en la ruta `/operacion` para que los operadores logísticos puedan registrar equipajes individuales conectándose al endpoint `POST /api/equipajes`. La página actual solo muestra un mapa con equipajes recientes, pero carece de la funcionalidad de registro.

## What Changes

- Crear formulario de registro de equipaje en `/operacion`
- Campo `id_equipaje` (texto libre)
- Campo `destino_iata` (select con todos los IATA de destinos disponibles)
- Campo `vuelo_id` (select cargado desde `GET /vuelos?estado=PROGRAMADO`)
- Campo `sla_comprometido` (input numérico para horas)
- POST al endpoint `POST /api/equipajes` al enviar
- Mostrar respuesta del servidor con plan de viaje generado
- Manejo de errores con feedback visual
- Fallback a mock data si la API no está disponible

## Capabilities

### New Capabilities
- `registro-equipaje`: Formulario de registro unitario de equipaje con select dinámico de vuelos programados y manejo de respuesta del plan de viaje.

### Modified Capabilities
- `frontend-structure.md`: Actualizar sección `/operacion` para incluir el formulario de registro.
- `TAREAS_FRONTEND.md`: Marcar C2 como completada.

## Impact

- Archivo modificado: `frontend/app/operacion/page.tsx`
- Archivo modificado: `frontend/lib/types.ts` (nuevos tipos para request/response)
- Archivo modificado: `openspec/specs/TAREAS_FRONTEND.md` (marcar C2	done)
- Dependencias API: `POST /equipajes`, `GET /vuelos?estado=PROGRAMADO`