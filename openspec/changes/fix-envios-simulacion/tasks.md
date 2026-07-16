## 1. Backend: Agregar queries con filtro sesionId en EquipajeRepository

- [x] 1.1 Agregar `findEnviosPanelBySesion` con JOIN a PlanViaje y `WHERE pv.sesionId = :sesionId`
- [x] 1.2 Agregar `findEnRutadoSaliendoBySesion` con filtro `pv.sesionId = :sesionId`
- [x] 1.3 Agregar `findEnAlmacenEnNodoBySesion` con filtro `pv.sesionId = :sesionId`
- [x] 1.4 Agregar `findEnVueloLlegandoBySesion` con filtro en `vueloActual.sesionId` o adaptar según modelo

## 2. Backend: Modificar servicios y controladores

- [x] 2.1 En `SesionService.obtenerEnviosPanelSesion()` usar `findEnviosPanelBySesion` y eliminar filtro in-memory
- [x] 2.2 En `EquipajeService.obtenerEnviosPorNodoConClasificacion()` aceptar `UUID sesionId` nullable y usar queries BySesion cuando no sea null
- [x] 2.3 En `NodoController.obtenerEnviosNodo()` agregar `@RequestParam(required=false) UUID sesionId`

## 3. Frontend: Propagar sesionId en componentes

- [x] 3.1 En `lib/api.ts` modificar `fetchEnviosNodoConClasificacion` para aceptar `sesionId?: string` opcional
- [x] 3.2 En `DetalleEnviosAeropuerto.tsx` agregar prop `sesionId?: string` y pasarlo al fetch
- [x] 3.3 En `PanelAeropuertosOperacion.tsx` agregar prop `sesionId?: string` y pasarlo a `DetalleEnviosAeropuerto`
- [x] 3.4 En `PanelTabs.tsx` pasar `sesionId` a `PanelAeropuertosOperacion`
- [x] 3.5 En `page.tsx` SimulacionView pasar `sesionId` a `PanelAeropuertosOperacion`

## 4. Verificar compilación

- [x] 4.1 Ejecutar build de backend (Maven) y confirmar que compila
- [x] 4.2 Ejecutar `npx tsc --noEmit` en frontend y confirmar que no hay errores
