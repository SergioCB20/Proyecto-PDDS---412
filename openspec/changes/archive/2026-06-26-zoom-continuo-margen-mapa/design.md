## Context

El módulo de mapas (`frontend/components/mapa/`) usa Leaflet con React-Leaflet. Actualmente:

- El `MapContainer` usa `zoomControl={true}` (controles +/- por defecto de Leaflet)
- El zoom es discreto con `zoomSnap` por defecto = 1 (solo enteros)
- No hay indicador visual del nivel de zoom actual
- El contenedor del mapa no tiene padding interno; los marcadores pueden quedar pegados al borde
- La leyenda `GeoMapaLeyenda` está fuera del `MapContainer` como overlay absoluto

El cambio debe ser puramente del lado del frontend, sin afectar backend ni API.

## Goals / Non-Goals

**Goals:**
- Reemplazar el control de zoom nativo de Leaflet por uno personalizado con slider
- Mostrar el zoom actual como porcentaje sobre el rango total (minZoom–maxZoom)
- Habilitar zoom continuo con pasos de 0.5
- Agregar margen visual de 10px alrededor del mapa
- Aplicar a los módulos de Operación y Simulación (ambos usan `GeoMapa`)

**Non-Goals:**
- No cambiar la lógica de negocio, API, tipos, o comportamiento de vuelos/aeropuertos
- No modificar la leyenda `GeoMapaLeyenda` ni su funcionamiento
- No agregar dependencias externas nuevas

## Decisions

### 1. Slider vs. controles +/- nativos
**Decisión:** Slider horizontal con botones `−` y `+` a los lados.
- **Alternativa:** Mantener controles nativos de Leaflet + indicador aparte. Descartado porque el slider ofrece control continuo más intuitivo para "zoom continuo (manejar %)".
- **Alternativa:** Control tipo knob circular. Descartado por complejidad innecesaria.

### 2. Cálculo del porcentaje
**Decisión:** `porcentaje = ((zoom - minZoom) / (maxZoom - minZoom)) * 100`
- Rango total: minZoom=2 a maxZoom=14 → 12 pasos de 0.5
- Zoom 2 = 0%, zoom 8 = 50%, zoom 14 = 100%
- **Alternativa:** Porcentaje relativo al zoom inicial (4 = 100%). Descartado porque el rango fijo es más predecible.

### 3. Margen del mapa: CSS padding vs. fitBounds
**Decisión:** `padding: 10px` en el wrapper div del mapa + color de fondo del wrapper para visualizar el margen.
- El `MapContainer` dentro con `w-full h-full` ocupa el área interior automáticamente
- No requiere recalcular bounds ni suscripción a eventos
- **Alternativa:** `map.fitBounds(bounds, { padding: [10, 10] })`. Descartado porque requiere calcular bounds de todos los elementos y se reajustaría al cambiar datos.

### 4. Posicionamiento del ControlZoom
**Decisión:** Esquina inferior izquierda (`bottom-4 left-4`), para no solaparse con la leyenda que está en `bottom-4 right-4`.
- Se renderiza dentro del `MapContainer` como hijo (igual que la leyenda)

### 5. Zoom continuo: zoomSnap
**Decisión:** `zoomSnap={0.5}` con `zoomDelta={0.5}` para pasos finos pero no infinitesimales.
- Suficientemente suave para scroll wheel
- Los botones +/− mueven en pasos de 0.5
- El slider tiene `step={0.5}`
- **Alternativa:** `zoomSnap={0}` (continuo puro). Descartado porque valores con muchos decimales saturan la UI.

## Risks / Trade-offs

- **[Slider visible en mapas pequeños]** → El control tiene `min-w-[180px]` y se posiciona con `z-[1000]` para estar sobre el mapa.
- **[Movimiento de leyenda]** → `GeoMapaLeyenda` se mueve dentro del `MapContainer` pero conserva su posición `absolute bottom-4 right-4`. No hay cambio visual para el usuario.
- **[Padding reduce área del mapa en ~20px]** → Es el efecto deseado. El mapa es `flex-1` y tiene espacio suficiente para absorber 10px de padding.
