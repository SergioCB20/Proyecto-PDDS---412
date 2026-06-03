## 1. Archivar C4 como completado

- [ ] 1.1 Marcar subtareas 1.1, 2.1 y 3.1 como `[x]` en `openspec/changes/archive/2026-06-02-implementar-c4/tasks.md`

## 2. Fix colores de nodos en simulación

- [ ] 2.1 Agregar constante `COLOR_NODO_MAP` con `as const` en `simulacion/[id]/page.tsx` mapeando `VERDE` → `#22c55e`, `AMBAR` → `#eab308`, `ROJO` → `#ef4444`
- [ ] 2.2 En el `useMemo` de `nodosEnMapa`, reemplazar `color: n.color` por `color: COLOR_NODO_MAP[n.color as keyof typeof COLOR_NODO_MAP] ?? '#6b7280'`
- [ ] 2.3 Agregar `key` prop dinámica a `GeoMapaNodo` en `GeoMapa.tsx` usando `${nodo.codigo_iata}-${nodo.color}` para forzar recreación del círculo al cambiar color

## 3. Fix animación de vuelos

- [ ] 3.1 En `GeoMapaVuelo.tsx`, desestructurar `animacionActiva` de props y usarlo para ajustar opacidad del marcador y la Polyline
- [ ] 3.2 Aplicar opacidad 0.4 al marcador y 0.2 a la línea cuando `animacionActiva === false`; opacidad normal (1.0 y 0.5) cuando `true`

## 4. Indicador de conexión WebSocket

- [ ] 4.1 En `simulacion/[id]/page.tsx`, agregar indicador visual en el panel lateral usando `connected` de `useTelemetria`
- [ ] 4.2 Mostrar punto verde + "Telemetría conectada" cuando `connected === true`, punto rojo + "Telemetría desconectada" cuando `false`

## 5. Verificación

- [ ] 5.1 Ejecutar `npm run build` en frontend — sin errores de compilación
