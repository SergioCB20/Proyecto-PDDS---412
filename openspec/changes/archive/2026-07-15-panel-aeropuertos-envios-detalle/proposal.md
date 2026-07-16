## Why

El panel de aeropuertos actual solo muestra ocupación del almacén. El operador logístico no puede ver qué envíos están saliendo o llegando desde/hacia cada aeropuerto sin abrir un modal por cada uno, y los datos del modal actual son incorrectos porque usan `origenIata`/`destinoIata` originales en vez de la ubicación real del equipaje. Se necesita una vista integrada que muestre, en el propio panel de aeropuertos, los envíos clasificados por dirección (saliendo/llegando) con su información detallada.

## What Changes

- **Nuevo endpoint** `GET /api/nodos/{iata}/envios` que retorna los envíos clasificados en "saliendo" y "llegando", con información detallada de cada envío (código, cantidad, estado, vuelo, maletas individuales) y conteos agregados.
- **Mejora de queries** en `EquipajeRepository` para encontrar equipaje por su ubicación real (usando `SegmentoPlan`, `PlanViaje.ubicacion`, `vueloActual.destino`) en lugar de los campos `origenIata`/`destinoIata` que representan origen original y destino final.
- **Panel dividido** en `PanelAeropuertosOperacion`: tabla de aeropuertos con columnas de conteo (saliendo/llegando) arriba, y un panel de detalle abajo al seleccionar un aeropuerto, mostrando la lista de envíos saliendo y llegando con posibilidad de expandir maletas individuales.
- **Nuevo componente** `DetalleEnviosAeropuerto.tsx` para renderizar el panel de detalle inline.
- **Actualización de contratos API** y especificaciones de frontend.

## Capabilities

### New Capabilities
- `nodo-envios-clasificacion`: Clasificación de envíos por aeropuerto en "saliendo" (equipaje que está en el nodo esperando salir) y "llegando" (equipaje que llegó o está en ruta hacia el nodo), basada en la ubicación real usando `SegmentoPlan` y `vueloActual`.
- `panel-aeropuerto-detalle-envios`: Panel dividido en la vista de operación que muestra tabla de aeropuertos con conteos y, al seleccionar uno, un detalle inline con la lista de envíos saliendo/llegando, expandible por maleta individual.

### Modified Capabilities
- `api-contracts`: Se agrega el endpoint `GET /api/nodos/{iata}/envios` con su request/response.
- `bc1-gestion-operativa`: Se agregan reglas de negocio para la clasificación de equipaje por ubicación real en nodos.
- `frontend-structure`: Se actualiza la estructura de componentes para incluir `DetalleEnviosAeropuerto.tsx` y los nuevos tipos.

## Impact

- **Backend**: `EquipajeRepository.java` (+3 queries JPQL), `EquipajeService.java` (+1 método, +3 DTOs), `NodoController.java` (+1 endpoint)
- **Frontend**: `lib/types.ts` (+3 interfaces), `lib/api.ts` (+1 función), `PanelAeropuertosOperacion.tsx` (modificación mayor), nuevo `DetalleEnviosAeropuerto.tsx`, ajustes en `page.tsx`
- **APIs**: Nuevo endpoint `GET /api/nodos/{iata}/envios` (no breaking, es adición)
