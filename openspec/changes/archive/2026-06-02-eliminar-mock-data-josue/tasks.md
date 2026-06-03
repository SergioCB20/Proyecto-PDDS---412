## 1. Corregir tipo CrearEquipajeResponse

- [x] 1.1 Cambiar interfaz `CrearEquipajeResponse` en `frontend/lib/types.ts` para reflejar la respuesta real del backend: `{ id, estado, id_externo?, destino_iata? }` — eliminar `plan_viaje`

## 2. Eliminar imports y estados iniciales mock

- [x] 2.1 Cambiar import en `frontend/app/operacion/page.tsx` de `{ MOCK_NODOS, MOCK_VUELOS, nodoToEnMapa }` a solo `{ nodoToEnMapa }`
- [x] 2.2 Inicializar `nodos` como `[]` en vez de `MOCK_NODOS.map(nodoToEnMapa)`
- [x] 2.3 Inicializar `allVuelos` como `[]` en vez de `MOCK_VUELOS`
- [x] 2.4 Inicializar `equipajesRecientes` como `[]` en vez de la lista de 8 objetos mock

## 3. Eliminar fallback mock en fetchData

- [x] 3.1 Eliminar `.catch(() => MOCK_NODOS)` en `api.get<Nodo[]>('/nodos')`
- [x] 3.2 Eliminar `.catch(() => ({ content: MOCK_VUELOS }))` en la llamada a vuelos
- [x] 3.3 Simplificar la asignación de `setNodos` y `setAllVuelos` asumiendo respuesta correcta del backend
- [x] 3.4 Agregar estado `apiError` y mostrar banner rojo con el mensaje de error en la UI
- [x] 3.5 Agregar `VueloPageResponse` a los tipos importados

## 4. Simplificar sección de éxito al crear equipaje

- [x] 4.1 Eliminar el bloque que accede a `formSuccess.plan_viaje.estado_sla` y `formSuccess.plan_viaje.segmentos`
- [x] 4.2 Dejar solo `formSuccess.id` y `formSuccess.estado` en el mensaje de éxito

## 5. Crear .env.local

- [x] 5.1 Crear `frontend/.env.local` con `NEXT_PUBLIC_API_URL=http://localhost:8080/api`

## 6. Verificar compilación inicial

- [x] 6.1 Ejecutar `next build` y confirmar que compila sin errores

## 7. Corregir error 500 al crear vuelo en backend

- [x] 7.1 Inyectar `PlanVuelosRepository` en `VueloService` (field + constructor)
- [x] 7.2 Agregar import de `PlanVuelos`, `PlanVuelosRepository` y `BigDecimal`
- [x] 7.3 En `crear()`: buscar `PlanVuelos` activo con `findFirstByOrderByVigenciaDesdeAsc()` y asignarlo al vuelo
- [x] 7.4 En `crear()`: asignar `origenLat`, `origenLon`, `destinoLat`, `destinoLon` desde los nodos
- [x] 7.5 En `actualizar()`: también actualizar coordenadas cuando cambian origen/destino

## 8. Deshabilitar selects cuando nodos está vacío (frontend)

- [x] 8.1 Agregar `disabled={nodos.length === 0}` y placeholder dinámico al Select "Destino IATA" del formulario de equipaje
- [x] 8.2 Agregar `disabled={nodos.length === 0}` y placeholder dinámico a los Selects "Origen" y "Destino" del formulario de vuelo

## 9. Verificar compilación final

- [x] 9.1 Ejecutar `mvn compile` en backend y confirmar que compila sin errores
- [x] 9.2 Ejecutar `next build` en frontend y confirmar que compila sin errores
