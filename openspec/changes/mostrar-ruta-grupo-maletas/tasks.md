## 1. Tipo RutaDestacada

- [ ] 1.1 Agregar interfaz `RutaDestacada` en `frontend/lib/types.ts` con `vueloIds: string[]` y `coordenadas: [number, number][]`

## 2. GeoMapa.tsx — Polyline de ruta destacada

- [ ] 2.1 Agregar prop `rutaDestacada?: RutaDestacada | null` al interface `GeoMapaProps`
- [ ] 2.2 Importar `Polyline` de `react-leaflet`
- [ ] 2.3 Renderizar `<Polyline>` condicional con las coordenadas de `rutaDestacada` (color `#2563eb`, weight 5, opacity 0.8)
- [ ] 2.4 Agregar `useEffect` que ejecute `map.fitBounds` con el bounds de la polyline cuando `rutaDestacada` cambie
- [ ] 2.5 Pasar `destacado={rutaDestacada?.vueloIds.includes(v.id)}` a cada `<GeoMapaVuelo>`
- [ ] 2.6 Agregar banner/botón "Cerrar ruta [ESC]" cuando `rutaDestacada` no es null
- [ ] 2.7 Integrar con el MapController existente para ESC (limpiar ruta)

## 3. GeoMapaVuelo.tsx — Prop destacado

- [ ] 3.1 Agregar prop `destacado?: boolean` a la interfaz del componente
- [ ] 3.2 Pasar `destacado` al `<AvionAnimado>`

## 4. AvionAnimado.tsx — Resalte visual

- [ ] 4.1 Agregar prop `destacado?: boolean`
- [ ] 4.2 Cuando `destacado` es true: trail más grueso (`strokeWidth` mayor), efecto glow (box-shadow o SVG filter), z-index superior

## 5. PanelEnviosOperacion.tsx — Botón "Mostrar ruta"

- [ ] 5.1 Agregar prop `onMostrarRuta?: (segmentos: SegmentoResponse[]) => void`
- [ ] 5.2 Importar `Route` de `lucide-react` y tipo `SegmentoResponse`
- [ ] 5.3 Agregar botón `Route` por fila, condicional a `onMostrarRuta`, con tooltip "Mostrar ruta en el mapa"
- [ ] 5.4 Implementar `handleMostrarRuta(id)`: setea estado de carga, llama `fetchPlanViaje`, extrae `segmentos`, llama `onMostrarRuta(segmentos)`, maneja errores
- [ ] 5.5 Mostrar spinner (Loader2 animate-spin) durante la carga

## 6. PanelEnvios.tsx — Botón "Mostrar ruta"

- [ ] 6.1 Agregar prop `onMostrarRuta?: (segmentos: SegmentoResponse[]) => void`
- [ ] 6.2 Importar `Route` de `lucide-react` y tipo `SegmentoResponse`
- [ ] 6.3 Agregar botón `Route` por fila (idéntico al paso 5.3)
- [ ] 6.4 Implementar `handleMostrarRuta(id)` (idéntico al paso 5.4)
- [ ] 6.5 Mostrar spinner (idéntico al paso 5.5)

## 7. page.tsx — Cableado en tres vistas

- [ ] 7.1 Agregar import de `RutaDestacada` y `SegmentoResponse`
- [ ] 7.2 En `OperacionView`: estado `rutaDestacada: RutaDestacada | null = null`
- [ ] 7.3 Implementar `handleMostrarRuta(segmentos)` que: busca vuelos por `codigo_vuelo`, arma coordenadas desde aeropuertos, setea `rutaDestacada`
- [ ] 7.4 Pasar `rutaDestacada` a `<GeoMapa>` y `onMostrarRuta` a `<PanelEnviosOperacion>`
- [ ] 7.5 En `SimulacionView`: mismo estado + handler + cableado
- [ ] 7.6 En `ColapsoView`: mismo estado + handler + cableado
