## Context

Actualmente los botones Seguir y Ruta existen únicamente a nivel de equipaje (grupo). Las maletas individuales solo tienen botón copiar. El tipo `Maleta` contiene `equipaje_id` (UUID) que permite reutilizar `fetchPlanViaje(equipajeId)` y los mismos handlers existentes sin backend nuevo.

Tres componentes necesitan cambios:
- **ModalEnvios**: lista expandida + lista plana "Todas las maletas del vuelo"
- **DetalleEnviosAeropuerto**: lista expandida por equipaje
- **PanelEnviosMaletas**: filas de equipaje → expandir para ver maletas individuales

## Goals / Non-Goals

**Goals:**
- Agregar botones Seguir (MapPin) y Ruta (Route) a cada maleta individual en los 3 componentes
- En `PanelEnviosMaletas`, agregar expand/collapse por fila para revelar maletas
- Reutilizar handlers `handleSeguir` y `handleMostrarRuta` existentes
- Misma paleta visual que los botones existentes

**Non-Goals:**
- No cambiar backend ni API
- No modificar el comportamiento de los botones a nivel equipaje
- No agregar nuevas funcionalidades (PDF, etc.) a nivel maleta

## Decisions

1. **Reutilizar handlers existentes**: Cada maleta tiene `equipaje_id` (UUID). Se pasa `m.equipaje_id` a los mismos `handleSeguir` y `handleMostrarRuta` que ya existen, sin crear nuevas funciones.

2. **PanelEnviosMaletas — expansión tipo acordeón**: Cada fila de equipaje gana un chevron. Al expandir, se llama `fetchMaletasEquipaje(item.codigo_equipaje)` (existe en api.ts) con el `codigo_equipaje` del item. Misma lógica que en ModalEnvios.

3. **Estados loading inline**: Cada estado de expansión en PanelEnviosMaletas se maneja con un `Record<string, MaletaExpandido>` similar a `expandidos` en ModalEnvios.

4. **Botones solo visibles si hay callbacks**: Los botones Seguir/Ruta solo se renderizan si `onSeguirEnMapa`/`onMostrarRuta` están definidos (consistente con el patrón existente).

## Risks / Trade-offs

- **PanelEnviosMaletas se vuelve más complejo**: Agregar expansión duplica la lógica de ModalEnvios. El estado `expandidos` necesita ser gestionado localmente.
- **Llamadas API adicionales**: Cada expansión en PanelEnviosMaletas dispara `fetchMaletasEquipaje`. Mitigación: solo se llama al expandir (lazy), no en carga inicial.
