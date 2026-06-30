## 1. Crear componente PanelTabs

- [x] 1.1 Crear `frontend/components/shared/PanelTabs.tsx` con interfaz `PanelTabsProps` que consolide las props de los 3 paneles internos
- [x] 1.2 Implementar estado `tab: 'aeropuertos' | 'vuelos' | 'envios'` con `useReducer`
- [x] 1.3 Renderizar barra de 3 tabs con estilo consistente (bg-blue-100 activo, bg-slate-100 inactivo)
- [x] 1.4 Renderizar condicionalmente `PanelAeropuertosOperacion`, `PanelVuelosOperacion` o `PanelEnviosMaletas` según tab activo
- [x] 1.5 Pasar las props correspondientes a cada panel interno según el grupo (aeropuertos, vuelos, envios)

## 2. Refactorizar OperacionView

- [x] 2.1 Reemplazar instancias de `PanelAeropuertosOperacion` + `PanelVuelosOperacion` + `PanelEnviosMaletas` por un solo `<PanelTabs>` en el JSX de OperacionView
- [x] 2.2 Integrar props de telemetría, callbacks y filtros de vuelo al `<PanelTabs>`

## 3. Refactorizar SimulacionView

- [x] 3.1 Reemplazar instancias de `PanelAeropuertosOperacion` + `PanelVuelosOperacion` + `PanelEnviosMaletas` por un solo `<PanelTabs>` en el JSX de SimulacionView
- [x] 3.2 Mantener la lógica condicional (mostrar tabs solo cuando `sesionId` esté presente y sesión no esté FINALIZADA)
- [x] 3.3 Pasar `sesionId` al `PanelTabs` para que el tab de Envíos lo reciba

## 4. Refactorizar ColapsoView

- [x] 4.1 Reemplazar instancias de `PanelAeropuertosOperacion` + `PanelVuelosOperacion` + `PanelEnviosMaletas` por un solo `<PanelTabs>` en el JSX de ColapsoView
- [x] 4.2 Aplicar misma lógica condicional que SimulacionView

## 5. Verificación

- [x] 5.1 Verificar compilación con `npm run build` o `npm run lint` desde frontend/
- [x] 5.2 Verificar que las 3 vistas renderizan correctamente las tabs sin errores en consola
- [x] 5.3 Confirmar que `PanelEntregados` y `ResumenVuelosOperacion` siguen visibles fuera de las tabs
