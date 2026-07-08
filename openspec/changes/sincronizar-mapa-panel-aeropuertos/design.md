## Context

Actualmente, el mapa (`GeoMapa`) y el panel lateral (`PanelTabs`) conviven en el mismo view pero no comparten estado de selección de aeropuertos en la dirección mapa → panel:

- **Panel → Mapa**: Funciona mediante `onAeropuertoVerEnMapa` → `setSeguidoAeropuertoId` → `MapController.flyTo()`
- **Mapa → Panel**: No existe. El `GeoMapaAeropuerto` solo abre un `Popup` de Leaflet sin propagar el evento

Los aeropuertos se identifican por `codigo_iata` (string). El estado `seguidoAeropuertoId` ya existe para el fly-to del mapa. Se necesita un estado adicional `aeropuertoSeleccionadoId` para la sincronización con el panel.

## Goals / Non-Goals

**Goals:**
- Al hacer clic en un marcador de aeropuerto en el mapa, el panel debe cambiar a la pestaña Aeropuertos
- El aeropuerto clickeado debe ser visible en la lista (scroll automático)
- El aeropuerto debe tener un highlight visual para distinguirse
- La funcionalidad debe funcionar en los 3 views: OperacionView, SimulacionView, ColapsoView

**Non-Goals:**
- No se abre el panel de envíos (`selectedEnvio`) automáticamente
- No se cambia el comportamiento de los vuelos o envíos
- No se modifica el backend ni la API
- No se modifica el zoom/centrado actual del mapa al hacer clic (ya existente vía seguidoAeropuertoId)

## Decisions

| Decisión | Opción | Elegida | Razón |
|---|---|---|---|
| **Estado de selección** | Crear `aeropuertoSeleccionadoId` separado vs reusar `seguidoAeropuertoId` | Separado | `seguidoAeropuertoId` se limpia con ESC, y controla tanto panel como mapa. Separarlos permite que el panel retenga la selección incluso cuando el usuario presiona ESC para salir del seguimiento |
| **Scroll al item** | `scrollIntoView` con refs vs `useEffect` + querySelector | Refs vía `useRef<Record<string, HTMLDivElement>>` | Más reactivo, evita selectores frágiles, funciona con items en lista virtual/scrolleable |
| **Highlight visual** | Clase condicional vs anillo animado | Borde azul + anillo (ring-2) | Consistente con el estilo visual del proyecto (azul como color primario) |
| **Cambio de tab** | Forzar setTab vs solo cuando no está en aeropuertos | Forzar siempre a 'aeropuertos' | Si el usuario está en Vuelos y clickea un aeropuerto en el mapa, debe llevarlo a la lista de aeropuertos |

## Riesgos / Trade-offs

- **[Rendimiento] Uso de refs por item**: Para ~50 aeropuertos, 50 refs es aceptable. Si creciera a 500+, considerar virtualización.
  - **Mitigación**: Usar `useRef` con objeto en vez de `useRef` por item individual.
- **[UX] Scroll interrumpe al usuario**: Si el usuario está scrolleando y ocurre un highlight, pierde su posición.
  - **Mitigación**: El scroll solo ocurre por acción explícita del usuario (click en mapa).
- **[Mantenimiento] Tres views separadas**: `OperacionView`, `SimulacionView`, `ColapsoView` tienen lógica duplicada.
  - **Mitigación**: El cambio es pequeño (agregar estado + handler + prop). No justifica refactor a hook compartido.
