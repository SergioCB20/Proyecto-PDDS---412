## 1. Actualizar cadena de tipos en componentes del mapa

- [x] 1.1 `AvionAnimado.tsx` — cambiar firma de `onVueloSeleccionado` a `(id: string, codigo: string)` y pasar `vuelo.codigo_vuelo` en el `eventHandlers.click`
- [x] 1.2 `GeoMapaVuelo.tsx` — actualizar tipo de `onVueloSeleccionado` en la interfaz `GeoMapaVueloProps`
- [x] 1.3 `GeoMapa.tsx` — actualizar tipo de `onVueloSeleccionado` en la interfaz `GeoMapaProps`

## 2. Modificar handlers en page.tsx

- [x] 2.1 `handleVueloSeleccionadoOp` (OperacionView, ~línea 317) — recibir `(id, codigo)` y agregar `setSelectedEnvio({ tipo: "vuelo", id, codigo })`
- [x] 2.2 `handleVueloSeleccionadoSim` (SimulacionView, ~línea 1146) — recibir `(id, codigo)` y agregar `setSelectedEnvio({ tipo: "vuelo", id, codigo })`
- [x] 2.3 `handleVueloSeleccionadoCol` (ColapsoView, ~línea 1748) — recibir `(id, codigo)` y agregar `setSelectedEnvio({ tipo: "vuelo", id, codigo })`

## 3. Verificar compilación

- [x] 3.1 Ejecutar `npx tsc --noEmit` en frontend/ y confirmar que no hay errores de tipo
