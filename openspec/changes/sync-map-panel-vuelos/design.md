## Context

Actualmente, el mapa (`GeoMapa`) y el panel lateral (`PanelTabs`) conviven en el mismo view pero no comparten estado de selección de vuelos en la dirección mapa → panel:

- **Panel → Mapa**: Funciona mediante `onVerEnMapa` → `setSeguidoVueloId` → `MapController.flyTo()`
- **Mapa → Panel**: No existe. El `AvionAnimado` solo llama `onSeguirVuelo` que hace fly-to sin actualizar el panel

Los vuelos se identifican por `id` (string UUID). El mismo patrón usado para aeropuertos se replica para vuelos: nuevo estado `vueloSeleccionadoId` para panel sync, manteniendo `seguidoVueloId` para fly-to.

## Goals / Non-Goals

**Goals:**
- Al hacer clic en un marcador de vuelo en el mapa, el panel debe cambiar a la pestaña Vuelos
- El vuelo clickeado debe ser visible en la lista (scroll automático)
- El vuelo debe tener un highlight visual para distinguirse
- Debe funcionar en los 3 views: OperacionView, SimulacionView, ColapsoView
- Aplica para vuelos PROGRAMADO y EN_RUTA (AvionAnimado clickeable)

**Non-Goals:**
- No se abre el panel de envíos (`selectedEnvio`) automáticamente
- No se cambia el comportamiento de aeropuertos o envíos
- No se modifica el backend ni la API
- No se modifica el fly-to del mapa (onSeguirVuelo sigue igual)
- No incluye vuelos COMPLETADOS (sin marcador clickeable)

## Decisions

| Decisión | Opciones | Elegida | Razón |
|---|---|---|---|
| **Propagación del click** | Nuevo callback separado `onVueloSeleccionado` vs reusar `onSeguirVuelo` | Nuevo callback | `onSeguirVuelo` también se usa desde el panel ("Ver en mapa"), no queremos que eso también dispare panel sync |
| **Identificador** | `vuelo.id` (UUID) vs `vuelo.codigo_vuelo` | `vuelo.id` | Consistente con key del item en el panel, evita ambigüedad |
| **Patrón de scroll** | Refs + `scrollIntoView` (mismo que aeropuertos) | Refs | Mismo enfoque probado, consistente y reactivo |
| **Cambio de tab** | Forzar tab a 'vuelos' | Forzar siempre | Si el usuario está en Aeropuertos y clickea un vuelo, debe llevarlo a la lista de vuelos |

## Risks / Trade-offs

- **[Rendimiento]** Misma preocupación que aeropuertos: refs para hasta 100 items (MAX_RENDER) es aceptable
- **[Vuelos COMPLETADOS]** No tienen marker clickeable, solo Polyline. Si se requiere en el futuro, habrá que agregar un Marker adicional en `GeoMapaVuelo`
