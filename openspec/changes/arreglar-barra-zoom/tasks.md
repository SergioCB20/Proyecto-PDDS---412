## 1. Modificar ControlZoom.tsx

- [x] 1.1 Agregar constantes `SLIDER_MIN = 0`, `SLIDER_MAX = 200`, `SLIDER_STEP = 1`
- [x] 1.2 Agregar función `toLeaflet(slider)` que convierta valor del slider (0–200) a zoom de Leaflet (2–14)
- [x] 1.3 Agregar función `toSlider(leafletZoom)` que convierta zoom de Leaflet (2–14) a valor del slider (0–200)
- [x] 1.4 Cambiar `useState` para que almacene el valor del slider en lugar del zoom de Leaflet
- [x] 1.5 Actualizar el listener `zoomend` para convertir el zoom de Leaflet a valor del slider
- [x] 1.6 Actualizar `handleSlider` para convertir el valor del slider a zoom de Leaflet antes de llamar `map.setZoom()`
- [x] 1.7 Cambiar `handleZoomIn`/`handleZoomOut` para que incrementen/decrementen el slider en 1
- [x] 1.8 Cambiar la etiqueta para que muestre el valor del slider (0–200) en lugar del porcentaje (0–100%)
- [x] 1.9 Actualizar props del `<input type="range">`: `min`, `max`, `step`
- [x] 1.10 Actualizar condiciones `disabled` de los botones `+`/`−` para usar `SLIDER_MIN`/`SLIDER_MAX`

## 2. Verificar compilación

- [x] 2.1 Ejecutar `npm run lint` para verificar que no hay errores de tipo (0 errores, 3 warnings pre-existentes sin relación)
