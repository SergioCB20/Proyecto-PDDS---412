## Why

La vista de simulación en vivo (`/simulacion/[id]`) carece de una interfaz moderna y funcional para monitorear la operación logística. Actualmente el panel derecho es fijo (no colapsable), los indicadores visuales de capacidad/ocupación son básicos, las rutas de vuelo son líneas rectas sin contexto visual, y no se muestra la fecha/hora real y virtual de forma completa. Estas mejoras son necesarias para que el analista pueda tener una experiencia de monitoreo eficiente durante las simulaciones.

## What Changes

- **T1**: Sidebar derecho colapsable con botón de toggle (ícono menú/chevron). Al colapsar, mostrar solo una pestaña angosta con indicadores mínimos.
- **T2**: Nodos en el mapa usan color según ocupación del almacén (verde < 70%, ámbar 70-90%, rojo > 90%) con actualización en vivo vía telemetría.
- **T3**: Vuelos en el mapa muestran un `Popup` de Leaflet al hacer clic con código, ocupación %, capacidad, y color de fondo verde/ámbar/rojo.
- **T4**: Mostrar fecha/hora REAL de inicio usando el nuevo campo `fecha_inicio_real` del backend (B1).
- **T5**: Mostrar fecha/hora REAL actual calculada como `fechaInicioReal + segundosRealesTranscurridos`, que se congela al finalizar la sesión.
- **T6**: Mostrar fecha/hora VIRTUAL de inicio desde los `searchParams` de la URL.
- **T7**: Mostrar fecha/hora VIRTUAL actual congelando el valor al llegar al estado `FINALIZADA`.
- **T8**: Reemplazar `Polyline` recto por curvas bezier/arco entre origen y destino usando interpolación matemática.
- **B1**: Agregar `fecha_inicio_real` al DTO `MetricasSesionResponse` en el backend (cambio compartido previo).

## Capabilities

### New Capabilities
- `sidebar-colapsable`: Sidebar colapsable con toggle y estado reducido para la vista de simulación.
- `indicadores-ocupacion-mapa`: Indicadores visuales de capacidad/ocupación (verde/ámbar/rojo) en nodos y vuelos del mapa.
- `fechas-simulacion`: Visualización de fecha/hora real y virtual de inicio y actual en la simulación.
- `rutas-curvas-vuelo`: Líneas curvas (bezier/arco) para representar rutas de vuelo en el mapa.

### Modified Capabilities
- `bc2-planificacion-replanificacion`: Agregar campo `fecha_inicio_real` a `MetricasSesionResponse` para exponer la fecha/hora real de inicio de la sesión.

## Impact

- **Frontend**: `app/simulacion/[id]/page.tsx` (sidebar, fechas), `components/mapa/GeoMapaNodo.tsx` (colores ocupación), `components/mapa/GeoMapaVuelo.tsx` (popup capacidad + curvas), `lib/types.ts` (tipos actualizados)
- **Backend**: `bc2/application/MetricasSesionResponse.java` (nuevo campo), `bc2/application/TickService.java` (incluir en JSON de Redis), `bc2/application/SesionService.java` (mapear desde entidad/Redis)
- **Dependencias**: Posiblemente `leaflet-curve` o similar para curvas bezier (o implementación manual)
