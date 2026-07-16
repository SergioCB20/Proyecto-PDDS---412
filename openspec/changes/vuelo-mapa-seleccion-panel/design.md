## Context

Actualmente, al hacer clic en un vuelo en el mapa se disparan dos callbacks:
- `onSeguirVuelo(vuelo.id)` → mueve la cámara al vuelo
- `onVueloSeleccionado(vuelo.id)` → setea estado de selección en la vista

El panel de vuelos ya reacciona correctamente a `vueloSeleccionadoId`: cambia la pestaña, hace scroll, y resalta la fila. Pero el detalle del vuelo (ModalEnvios) solo se abre al hacer clic en la fila del panel, no desde el mapa.

La información necesaria para abrir el modal (`id` UUID y `codigo_vuelo`) ya está disponible en el objeto `vuelo` de `AvionAnimado`, pero `onVueloSeleccionado` solo propaga el `id`.

## Goals / Non-Goals

**Goals:**
- Al hacer clic en cualquier vuelo (EN_RUTA o PROGRAMADO) en el mapa, abrir el ModalEnvios con la información del vuelo
- Mantener el comportamiento existente de selección (cambio de pestaña, scroll, resalte)
- Funcionar en las 3 vistas: OperacionView, SimulacionView, ColapsoView

**Non-Goals:**
- No cambiar el comportamiento de selección de aeropuertos
- No modificar el modal ModalEnvios ni su contenido
- No afectar vuelos COMPLETADOS (no tienen marcador clickeable)

## Decisions

- **Agregar `codigo` al callback `onVueloSeleccionado`** en lugar de crear un callback nuevo. Esto minimiza los cambios en la cadena de componentes (solo cambiar firma, no agregar props).
- **Los handlers en `page.tsx` llaman `setSelectedEnvio`** directamente, reutilizando el mismo estado que usa el clic en fila del panel. No se necesita lógica duplicada.
- **Los 3 views tienen su propia instancia de `selectedEnvio`/`setSelectedEnvio`** (por diseño de page.tsx), así que cada handler se modifica independientemente.
- No se abre el modal para vuelos COMPLETADOS porque estos no se renderizan con `AvionAnimado` (no tienen `eventHandlers.click`), solo se muestran como polilíneas.

## Riesgos / Trade-offs

- **Riesgo de tipo:** Cambiar la firma de `onVueloSeleccionado` de `(id: string)` a `(id: string, codigo: string)` podría romper compilación si hay otros consumidores. → Se actualizan todos los tipos en la cadena: `AvionAnimado` → `GeoMapaVuelo` → `GeoMapa` → `page.tsx`. TypeScript garantiza que no queden inconsistencias.
- **UX:** El modal se abre automáticamente al hacer clic en el mapa. Si el usuario quiere solo enfocar el vuelo sin abrir el modal, podría ser intrusivo. → El comportamiento es consistente con el clic en la fila del panel, que también abre el modal.
