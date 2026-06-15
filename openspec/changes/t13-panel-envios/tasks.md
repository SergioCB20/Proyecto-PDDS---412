## 1. Tipos y API

- [x] 1.1 Agregar `EnvioItemResponse` a `frontend/lib/types.ts`
- [x] 1.2 Agregar función helper `fetchEnviosVuelo(sesionId, vueloId)` y `fetchEnviosNodo(sesionId, nodoIata)` en `frontend/lib/api.ts`

## 2. Componente PanelEnvios

- [x] 2.1 Crear `frontend/components/simulacion/PanelEnvios.tsx` con props: `sesionId`, `selectedEnvio`, `onClose`
- [x] 2.2 Implementar fetch (B2/B3) según `selectedEnvio.tipo` con estados loading/error/empty
- [x] 2.3 Renderizar lista de envíos (origen, destino, código equipaje, cantidad) con scroll
- [x] 2.4 Agregar botón "Cerrar" que llama a `onClose`
- [x] 2.5 Agregar auto-scroll (`scrollIntoView`) al subpanel cuando se abre

## 3. Modificar PanelVuelos

- [x] 3.1 Agregar prop `onVueloClick?: (id: string, codigo: string) => void` en `PanelVuelosProps`
- [x] 3.2 Hacer cada item clickeable (cursor pointer, hover highlight, onClick)

## 4. Modificar PanelNodos

- [x] 4.1 Agregar prop `onNodoClick?: (id: string, codigo: string) => void` en `PanelNodosProps`
- [x] 4.2 Hacer cada item clickeable (cursor pointer, hover highlight, onClick)

## 5. Integrar en page.tsx

- [x] 5.1 Agregar estado `selectedEnvio` en `SimulacionContent`
- [x] 5.2 Pasar `onVueloClick` a `PanelVuelos` y `onNodoClick` a `PanelNodos`
- [x] 5.3 Renderizar `PanelEnvios` condicionalmente en el sidebar (envuelto en div con `ref` para scrollIntoView)
- [x] 5.4 Implementar `onClose` que limpia `selectedEnvio`

## 6. Verificación

- [x] 6.1 Ejecutar `npx tsc --noEmit` y verificar que no hay errores
- [x] 6.2 Compilar frontend con `npm run build`
