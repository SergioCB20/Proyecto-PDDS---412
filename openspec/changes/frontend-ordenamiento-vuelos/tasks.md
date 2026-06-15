## 1. Backend

- [ ] 1.1 Agregar `hora_salida` y `hora_llegada` al JSON de telemetría en `TelemetriaService.java`

## 2. Frontend — Types

- [ ] 2.1 Agregar `hora_salida` y `hora_llegada` a la interfaz `VueloTelemetria` en `types.ts`

## 3. Frontend — Componente

- [ ] 3.1 Agregar estado `orden` con `useState('')` en `PanelVuelos.tsx`
- [ ] 3.2 Agregar `useMemo` con lógica de ordenamiento para los 6 criterios
- [ ] 3.3 Agregar `<Select>` de ordenamiento en el JSX entre los filtros y la lista
- [ ] 3.4 Cambiar `vuelosFiltrados.map` por `vuelosOrdenados.map` en el render

## 4. Verificación

- [ ] 4.1 Compilar backend (`mvn clean compile`)
- [ ] 4.2 Verificar TypeScript frontend (`npx tsc --noEmit`)
