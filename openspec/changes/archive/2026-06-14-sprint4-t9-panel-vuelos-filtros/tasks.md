## 1. Crear el componente PanelVuelos

- [x] 1.1 Crear directorio `frontend/components/simulacion/`
- [x] 1.2 Crear `frontend/components/simulacion/PanelVuelos.tsx` con interfaz `{ vuelos: VueloTelemetria[] }`
- [x] 1.3 Agregar estados `filtroCodigo`, `filtroOrigen`, `filtroDestino` con `useState`
- [x] 1.4 Derivar `opcionesOrigen` y `opcionesDestino` únicas desde `vuelos` con `useMemo`
- [x] 1.5 Derivar `vuelosFiltrados` aplicando los 3 filtros con `useMemo`
- [x] 1.6 Renderizar título "Vuelos" y contador "Mostrando X de Y vuelos"
- [x] 1.7 Renderizar fila de inputs: `Input` para código, `Select` para origen, `Select` para destino
- [x] 1.8 Renderizar botón "Limpiar filtros" condicional (solo si hay filtros activos)
- [x] 1.9 Renderizar listado de vuelos con el mismo estilo visual actual (código, ruta, barra de ocupación)
- [x] 1.10 Manejar caso sin datos: mostrar mensaje "Sin datos de vuelos"

## 2. Integrar PanelVuelos en la vista de simulación

- [x] 2.1 Importar `PanelVuelos` en `frontend/app/simulacion/[id]/page.tsx`
- [x] 2.2 Reemplazar la sección "Ocupación de Vuelos" (líneas 420–456) por `<PanelVuelos vuelos={telemetria?.vuelos ?? []} />`
- [x] 2.3 Verificar que `ResumenVuelos` se mantiene sin cambios
- [x] 2.4 Verificar build y que no hay errores de tipo

## 3. Verificación

- [x] 3.1 Ejecutar `npm run lint` en frontend y asegurar que no hay errores
- [x] 3.2 Ejecutar `npm run build` (incluye TypeCheck) y asegurar que pasa
- [x] 3.3 Probar en navegador que los filtros funcionan correctamente
