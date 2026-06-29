## 1. Modificar ControlZoom.tsx

- [x] 1.1 Agregar constantes `SLIDER_MIN = 0`, `SLIDER_MAX = 200`, `SLIDER_STEP = 1`
- [x] 1.2 Agregar función `toLeaflet(slider)` que convierta valor del slider (0–200) a zoom de Leaflet (2–14)
- [x] 1.3 Agregar función `toSlider(leafletZoom)` que convierta zoom de Leaflet (2–14) a valor del slider (0–200)
- [x] 1.4 `useState` solo para render (display); handlers leen `map.getZoom()` directamente
- [x] 1.5 Listener `zoomend` actualiza `display` desde `map.getZoom()`
- [x] 1.6 `handleSlider` llama `map.setZoom(toLeaflet(val))` sin estado intermedio
- [x] 1.7 `handleZoomIn`/`handleZoomOut`: leen `toSlider(map.getZoom())` → +1/‑1 → `map.setZoom(toLeaflet(next))`
- [x] 1.8 Etiqueta muestra `display` (0–200) en lugar del porcentaje (0–100%)
- [x] 1.9 Slider `min={0}`, `max={200}`, `step={1}`, `value={display}`
- [x] 1.10 Botones `disabled` con `SLIDER_MIN`/`SLIDER_MAX`

## 2. Verificar compilación

- [x] 2.1 Ejecutar `npm run lint` para verificar que no hay errores de tipo (0 errores, 3 warnings pre-existentes sin relación)
