## Why

El mapa interactivo actual tiene zoom discreto (saltos enteros) sin indicador de nivel de zoom, y los elementos del mapa (aeropuertos, rutas de vuelo) quedan pegados al borde del contenedor sin margen visual. Esto dificulta la experiencia de navegación y la legibilidad en los módulos de Operación y Simulación.

## What Changes

- Reemplazar el control de zoom por defecto de Leaflet por un control personalizado con slider continuo
- Agregar indicador de porcentaje de zoom en el control
- Agregar margen interno de ~1cm (10px) alrededor del mapa para separar visualmente el contenido del borde
- Habilitar zoom fraccionado (pasos de 0.5) para una experiencia de navegación más suave
- Los cambios aplican a ambos módulos: Operación y Simulación

## Capabilities

### New Capabilities
- `control-zoom-continuo`: Control de zoom personalizado con slider continuo, indicador de porcentaje y botones +/- de incremento fino

### Modified Capabilities
- *(ninguna — los cambios son únicamente de UI/UX en el mapa, no afectan contratos API ni comportamiento de specs existentes)*

## Impact

- **Frontend**: Se modifica `frontend/components/mapa/GeoMapa.tsx` y se crea `frontend/components/mapa/ControlZoom.tsx`
- **No hay impacto** en backend, API, base de datos, ni contratos existentes
- La leyenda del mapa (`GeoMapaLeyenda`) conserva su posición y comportamiento actual
