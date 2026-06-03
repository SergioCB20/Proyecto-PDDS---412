## 1. Archivar C4 como completado

- [x] 1.1 Marcar subtareas 1.1, 2.1 y 3.1 como `[x]` en `openspec/changes/archive/2026-06-02-implementar-c4/tasks.md`

## 2. Fix colores de nodos en simulación

- [x] 2.1 Agregar constante `COLOR_NODO_MAP` con `as const` en `simulacion/[id]/page.tsx` mapeando `VERDE` → `#22c55e`, `AMBAR` → `#eab308`, `ROJO` → `#ef4444`
- [x] 2.2 En el `useMemo` de `nodosTelemetria`, reemplazar `color: n.color` por `color: COLOR_NODO_MAP[n.color as keyof typeof COLOR_NODO_MAP] ?? '#6b7280'`
- [x] 2.3 Agregar `key` prop dinámica a `GeoMapaNodo` en `GeoMapa.tsx` usando `${nodo.codigo_iata}-${nodo.color}` para forzar recreación del círculo al cambiar color

## 3. Fix animación de vuelos

- [x] 3.1 En `GeoMapaVuelo.tsx`, desestructurar `animacionActiva` de props y usarlo para ajustar opacidad del marcador y la Polyline
- [x] 3.2 Aplicar opacidad 0.4 al marcador y 0.2 a la línea cuando `animacionActiva === false`; opacidad normal (1.0 y 0.5) cuando `true`

## 4. Indicador de conexión WebSocket

- [x] 4.1 En `simulacion/[id]/page.tsx`, agregar indicador visual en el panel lateral usando `connected` de `useTelemetria`
- [x] 4.2 Mostrar punto verde + "Telemetría conectada" cuando `connected === true`, punto rojo + "Telemetría desconectada" cuando `false`

## 5. Carga inicial REST como fallback

- [x] 5.1 Agregar estados `initialNodos` y `initialVuelos` en `simulacion/[id]/page.tsx`
- [x] 5.2 Agregar `useEffect` en mount que llama `GET /nodos` y `GET /vuelos` para cargar datos iniciales
- [x] 5.3 Mapear nodos REST a `NodoEnMapa[]` con colores calculados por ocupación
- [x] 5.4 Combinar fuentes: mostrar datos REST cuando WebSocket no ha enviado datos, telemetría cuando sí

## 6. Verificación

- [x] 6.1 Ejecutar `npm run build` en frontend — sin errores de compilación
