## Why

El control de zoom actual (`ControlZoom`) usa el zoom de Leaflet (2–14) como valor del slider con paso 0.5, lo que provoca que el porcentaje mostrado salte de ~4% en ~4% en lugar de ser continuo. Los usuarios reportan que "solo se puede tener más o menos zoom de 4 en 4", lo que dificulta un ajuste fino del nivel de zoom en los módulos de operación y simulación.

## What Changes

- El slider del `ControlZoom` cambiará de rango `2–14` (zoom Leaflet) a `0–200` (escala propia), con paso `1`.
- Los botones `+`/`−` incrementarán/decrementarán el valor del slider en 1 en lugar de 0.5 en zoom Leaflet.
- La etiqueta del slider mostrará el valor numérico `0–200` en lugar del porcentaje `0–100%`.
- Internamente se convertirá el valor del slider (0–200) al zoom de Leaflet (2–14) mediante una transformación lineal.
- **No breaking changes**: la API del componente y las props de `GeoMapa` no cambian.

## Capabilities

### New Capabilities

Ninguna. Es una modificación de una capability existente.

### Modified Capabilities

- `control-zoom-continuo`: El slider de zoom cambia de rango 2–14 (Leaflet) con paso 0.5 a rango 0–200 con paso 1. La etiqueta muestra el valor 0–200 en lugar del porcentaje 0–100%. La conversión a zoom Leaflet es interna y transparente.

## Impact

- **Archivo modificado**: `frontend/components/mapa/ControlZoom.tsx` — lógica del slider, botones y etiqueta.
- **Sin impacto en otros archivos**: `GeoMapa.tsx` (no requiere cambios), `AvionAnimado.tsx` (usa `map.getZoom()` directamente), ni ningún otro componente.
- **Sin cambios de API REST, base de datos ni dependencias**.
