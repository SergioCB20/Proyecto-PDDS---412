## 1. Margen interno del mapa (10px)

- [x] 1.1 En `GeoMapa.tsx`, agregar `style={{ padding: '10px' }}` al `div` wrapper del mapa
- [x] 1.2 Verificar que el `MapContainer` con `w-full h-full` ocupa correctamente el área interior

## 2. Zoom continuo en MapContainer

- [x] 2.1 En `GeoMapa.tsx`, agregar `zoomSnap={0.5}` y `zoomDelta={0.5}` al `MapContainer`
- [x] 2.2 Agregar `minZoom={2}` y `maxZoom={14}` al `MapContainer` para acotar el rango
- [x] 2.3 Cambiar `zoomControl={true}` a `zoomControl={false}` para ocultar los controles nativos de Leaflet

## 3. Mover GeoMapaLeyenda dentro del MapContainer

- [x] 3.1 Mover `<GeoMapaLeyenda>` dentro del `<MapContainer>` (antes estaba fuera) para que los overlays absolutos compartan el mismo contexto de posicionamiento

## 4. Crear componente ControlZoom

- [x] 4.1 Crear `frontend/components/mapa/ControlZoom.tsx` con el hook `useMap()` para acceder a la instancia de Leaflet
- [x] 4.2 Implementar slider (`<input type="range">`) con `min=2`, `max=14`, `step=0.5`, sincronizado bidireccionalmente con el zoom del mapa
- [x] 4.3 Agregar botón `−` que disminuye el zoom en 0.5 (respetando `minZoom`)
- [x] 4.4 Agregar botón `+` que aumenta el zoom en 0.5 (respetando `maxZoom`)
- [x] 4.5 Mostrar el zoom actual como porcentaje: `((zoom - 2) / (14 - 2)) * 100`, formateado con 0 decimales, más el sufijo `%`
- [x] 4.6 Suscribirse al evento `zoomend` del mapa para actualizar slider y porcentaje cuando el usuario usa scroll wheel
- [x] 4.7 Estilizar con fondo glass blanco, bordes redondeados, sombra (mismo estilo que `GeoMapaLeyenda`)
- [x] 4.8 Posicionar en esquina inferior izquierda (`absolute bottom-4 left-4 z-[1000]`)
- [x] 4.9 Importar y renderizar `<ControlZoom />` dentro del `<MapContainer>` en `GeoMapa.tsx`
