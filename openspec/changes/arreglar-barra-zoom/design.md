## Context

El `ControlZoom` en `frontend/components/mapa/ControlZoom.tsx` actualmente usa el nivel de zoom de Leaflet (2–14) directamente como valor del slider HTML con `step={0.5}`, y muestra un porcentaje lineal `0–100%`. Esto produce saltos de ~4% en la etiqueta por cada paso del slider, que los usuarios perciben como "zoom de 4 en 4".

Los módulos de operación (`/operacion`) y simulación (`/simulacion`) comparten el mismo componente `GeoMapa`, que a su vez usa `ControlZoom`. El cambio impacta a ambos módulos por igual.

## Goals / Non-Goals

**Goals:**
- El slider de zoom usará el rango `0–200` con paso `1`.
- Los botones `+`/`−` cambiarán el valor del slider en `1`.
- La etiqueta mostrará el valor del slider (`0–200`) directamente.
- La conversión a zoom de Leaflet (2–14) será interna y lineal.
- El comportamiento del scroll wheel y teclado no se modifica.

**Non-Goals:**
- No se modifican las props de `GeoMapa` ni su API pública.
- No se cambia `zoomSnap`, `zoomDelta` ni `wheelPxPerZoomLevel` en `GeoMapa`.
- No se modifica `AvionAnimado.tsx` (sigue usando `map.getZoom()` directamente).
- No se agregan nuevas dependencias.

## Decisions

1. **Slider 0–200 en lugar de porcentaje 0–100**: El usuario pidió explícitamente "barra de 0 a 200". Se escala el rango para duplicar la granularidad anterior (200 pasos vs 100), lo que combinado con paso 1 da control más fino.

2. **Conversión lineal slider ↔ Leaflet zoom**: `leafletZoom = 2 + (slider / 200) * 12`. Es simple, predecible y evita confusiones con escalas logarítmicas. Al ser lineal, el slider se siente uniforme en todo el rango.

3. **El estado del componente almacena el valor del slider (0–200), no el zoom de Leaflet**: Esto simplifica el render del slider y la lógica de los botones. La conversión a Leaflet solo ocurre al llamar `map.setZoom()` y al leer `map.getZoom()` en el evento `zoomend`.

4. **No se cambia `zoomSnap` ni `zoomDelta`**: Estos valores (0 y 0.5 respectivamente) controlan el comportamiento del scroll wheel y teclado, no del slider. El scroll wheel seguirá siendo suave. El slider controla el zoom mediante `map.setZoom()` directamente, que acepta cualquier valor fraccionario cuando `zoomSnap=0`.

## Risks / Trade-offs

- **Precisión limitada por Leaflet**: Internamente Leaflet redondea los niveles de zoom a ~5 decimales. Con paso 1 en el slider (0.06 en Leaflet), esto no es problema, pero pasos más pequeños serían imperceptibles.
- **Desajuste slider ↔ scroll wheel**: Si el usuario usa el scroll wheel, el zoom de Leaflet cambia en pasos de 0.5. El slider se actualiza al valor convertido más cercano (aprox. 8 unidades de slider). Esto es esperable y no un bug.
