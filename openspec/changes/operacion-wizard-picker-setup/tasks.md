# Tareas de implementación — wizard operación día-a-día

> Cada tarea es atómica. Marcar `[x]` cuando esté completa + verificada.

## 1. Backend — capacidad por sede

- [x] 1.1 Agregar constante `CAPACIDADES_ORIGINALES` y `record CapacidadRequest` en `NodoService.java`
- [x] 1.2 Implementar `NodoService.actualizarCapacidad(iata, capacidad)` con validación `1..9999`
- [x] 1.3 Implementar `NodoService.restaurarCapacidad(iata)` (lee `CAPACIDADES_ORIGINALES`)
- [x] 1.4 Crear `OperacionCapacidadController.java` con `POST /{iata}/capacidad` y `DELETE /{iata}/capacidad`
- [x] 1.5 Verificar `GlobalExceptionHandler` mapea `IllegalArgumentException` → 400 (ya está) y agregar handler para `NodoService.NodoNoEncontradoException` → 404 (revisar si ya existe similar)
- [x] 1.6 Test `OperacionNodoCapacidadTest`: happy path + cap inválida + iata inexistente
- [x] 1.7 Test `OperacionCapacidadControllerTest` (mockMvc): 200 OK + 400 (cap=0) + 404 (iata inexistente) + DELETE 200

## 2. Backend — separar planes de preparacion

- [x] 2.1 Renombrar `OperacionPreparacionService.preparar()` a `prepararYExpandir()` (comportamiento legacy intacto)
- [x] 2.2 Crear `OperacionPreparacionService.cargarPlanes(file, hora)` que sólo invoca `parseAndSavePlanes`
- [x] 2.3 Verificar que `parseAndSavePlanes` es reutilizable (ya es `private`, debe pasar a `private`/mantenerse — no cambia visibilidad)
- [x] 2.4 Modificar `OperacionPreparacionController.preparar()` para delegar a `prepararYExpandir()`
- [x] 2.5 Agregar `OperacionPreparacionController.cargarPlanes()` mapeado a `POST /planes`
- [x] 2.6 Test `OperacionPreparacionPlanesTest`: mock `nodoRepository` y verificar que `cargarPlanes` **NO** llama `nodoRepository.save(n)` ni `findByCodigoIata` (sólo parsea)
- [x] 2.7 Test `OperacionPreparacionLazyPlanVuelosTest`: con `planVuelosRepository` vacío, `cargarPlanes` lanza `IllegalStateException("No existe PlanVuelos base. Verificar seeds")`

## 3. Backend — sanity check

- [x] 3.1 `./mvnw test` debe estar verde (25 actuales + 4 nuevos = 29) → 38 tests, 0 failures

## 4. Frontend — helpers de API

- [x] 4.1 Agregar `setNodoCapacidadOperacion(iata, capacidad)` en `frontend/lib/api.ts`
- [x] 4.2 Agregar `cargarPlanesOperacion(file, horaPresentacion)` con `fetch` directo (NO `api.upload` — multipart sin `Content-Type` explícito)
- [x] 4.3 Verificar que `api.upload` funciona para envíos (multipart ya testado)

## 5. Frontend — SedePicker

- [x] 5.1 Crear `frontend/components/operacion/SedePicker.tsx`
- [x] 5.2 Constante `SEDES` con las 4 iatas + nombres (copiada de `recepcion/page.tsx:33`)
- [x] 5.3 Botón "Volver" arriba-izquierda → `router.push("/")`
- [x] 5.4 Grid 2×2 con cards 1-click → props `onPick(iata: string)`
- [x] 5.5 Estilos coherentes con `app/recepcion/page.tsx:206-219` (mismo template visual)

## 6. Frontend — SetupOperacion

- [x] 6.1 Crear `frontend/components/operacion/SetupOperacion.tsx`
- [x] 6.2 Props `{ iata, onListo, onCambiarSede }`
- [x] 6.3 State: `capacidad` (string), `planesFile`, `enviosFile`, `horaPresentacion` ("11"), `loading`, `error`, `success`, `estado`
- [x] 6.4 Hook de reloj local: usar `useReloj()` extraído o inline (idéntico a `app/page.tsx:91`)
- [x] 6.5 `useEffect` inicial → `GET /back/api/operacion/preparacion/estado`
- [x] 6.6 Header con IATA + nombre + tz + hora local en vivo + botón "Cambiar sede"
- [x] 6.7 Card 1 — Capacidad: input numérico + botón "Guardar capacidad" → `setNodoCapacidadOperacion(iata, capacidad)`
- [x] 6.8 Card 2 — Planes: file input + input numérico `hora_presentacion` (label explica que se teclea manualmente) + botón "Cargar planes" → `cargarPlanesOperacion`
- [x] 6.9 Card 3 — Envíos: file input + botón "Cargar envíos" → patrón `recepcion/page.tsx:139-171` con `api.upload + X-Device-Nodo-Id + getDeviceNodoId()`
- [x] 6.10 Card 4 — Estado actual: render del objeto `estado` (capacidades + tags)
- [x] 6.11 Botón grande "Siguiente → Ver mapa" abajo, deshabilitado si `loading` o `planes_tag_count==0 && envios_tag_count==0`
- [x] 6.12 Toasts inline de error/éxito (no hace falta componente dedicado — div con colores)

## 7. Frontend — integración en OperacionView

- [x] 7.1 En `frontend/app/page.tsx`, dentro de `OperacionView`: agregar `useState<"picker" | "setup" | "mapa">("picker")` inicializado desde `device.getAeropuertoRefId()` + `sessionStorage`
- [x] 7.2 Extraer JSX actual de `OperacionView` (todo el mapa + dock + paneles) en un sub-componente `<OperacionViewMapa configUmbrales={...} />` (interno, sin exportar) — o usar fragment condicional con early-return
- [x] 7.3 Render condicional: `stage==="picker"` → `<SedePicker onPick={...} />`
- [x] 7.4 Render condicional: `stage==="setup"` → `<SetupOperacion iata={...} onListo={...} onCambiarSede={...} />`
- [x] 7.5 Render condicional: `stage==="mapa"` → JSX actual de mapa
- [x] 7.6 Eliminar entrada `{ id: 'ir-recepcion', icon: Package, label: 'Ir a Recepción', variant: 'action' }` en los 3 arrays `secciones` de `DockIconos` (uno por vista: `OperacionView`, `SimulacionView`, `ColapsoView`) — solo OperacionView tenía la entrada
- [x] 7.7 Botón "Cambiar sede" ya disponible desde el dock → implementar handler que setea stage="picker" y limpia `sessionStorage.operacion_setup_done_v1`

## 8. Frontend — eliminar /recepcion

- [x] 8.1 Borrar `frontend/app/recepcion/page.tsx`
- [x] 8.2 Verificar con `grep -r "/recepcion" frontend/` (debe dar 0 referencias; excepto en `next.config.ts` que no menciona)
- [x] 8.3 Si encuentra referencias huérfanas → corregir (2 referencias en comentarios/documentación actualizadas)

## 9. Frontend — verificación

- [x] 9.1 `npm run lint` debe estar verde (0 problems)
- [x] 9.2 `npm run build` (opcional) debe compilar sin errores

## 10. Pruebas manuales end-to-end

- [ ] 10.1 Login operador → tab Operación → ver picker 4 sedes
- [ ] 10.2 Click SPIM → ver setup con header SPIM + hora local
- [ ] 10.3 Capacidad 999 → Guardar → toast OK
- [ ] 10.4 Cargar plans.txt (válido) con hora_presentacion=11 → toast planes cargados
- [ ] 10.5 Cargar envios.csv → toast ingresados
- [ ] 10.6 Botón "Siguiente → Ver mapa" → entra a OperacionView actual con vuelos del día
- [ ] 10.7 Botón "Cambiar sede" desde dock → vuelve a picker
- [ ] 10.8 Recargar (F5) tras setear capacidad 999 → entra directo a setup (no vuelve a picker)
- [ ] 10.9 Logout/login → estado en `device.getAeropuertoRefId` se limpia (es por-device, OK)
- [ ] 10.10 Verificar que `/recepcion` retorna 404 o redirect

## 11. Compatibilidad con admin

- [ ] 11.1 Login admin → ir a `/admin/prep` → setear capacidades a 999 + cargar planes → endpoint legacy `/preparacion` sigue funcionando idéntico (sigue llamando `setCapacidades999()` + parse)
- [ ] 11.2 Verificar `OperacionPreparacion.prepararYExpandir()` aún fija ALL 4 caps a 999 (no romper admin)
