## 1. CRUD Equipaje — Backend

- [x] 1.1 Agregar método `actualizar(UUID id, RegistrarEquipajeRequest request)` en `EquipajeService.java` — buscar equipaje por id, validar destino IATA y vuelo, actualizar campos, guardar y devolver `EquipajeResponse` con plan de viaje
- [x] 1.2 Agregar método `eliminar(UUID id)` en `EquipajeService.java` — buscar equipaje, eliminar segmentos y plan de viaje, liberar carga del vuelo, eliminar equipaje
- [x] 1.3 Agregar endpoint `PUT /api/equipajes/{id}` en `EquipajeController.java` con manejo de `EquipajeNoEncontradoException` (404) y `ValidacionException` (422)
- [x] 1.4 Agregar endpoint `DELETE /api/equipajes/{id}` en `EquipajeController.java` con manejo de `EquipajeNoEncontradoException` (404)

## 2. CRUD Vuelo — Backend

- [x] 2.1 Agregar `ValidacionException` como clase interna estática en `VueloService.java`
- [x] 2.2 Agregar `CrearVueloRequest` record en `VueloService.java` con campos: codigo_vuelo, origen_id, destino_id, hora_salida, hora_llegada, capacidad_carga
- [x] 2.3 Agregar método `crear(CrearVueloRequest request)` en `VueloService.java` — validar origen/destino, crear vuelo con estado PROGRAMADO y carga_disponible = capacidad_carga, guardar y devolver VueloResponse
- [x] 2.4 Agregar método `actualizar(UUID id, CrearVueloRequest request)` en `VueloService.java` — validar estado PROGRAMADO, validar origen/destino, actualizar campos, guardar
- [x] 2.5 Agregar método `eliminar(UUID id)` en `VueloService.java` — validar estado PROGRAMADO, validar que no tenga equipajes asignados, eliminar
- [x] 2.6 Agregar inyección de `NodoLogisticoRepository` y `EquipajeRepository` en `VueloService.java`
- [x] 2.7 Agregar `long countByVueloActualId(UUID vueloId)` en `EquipajeRepository.java`
- [x] 2.8 Agregar endpoint `POST /api/vuelos` en `VueloController.java` con manejo de `ValidacionException` (422)
- [x] 2.9 Agregar endpoint `PUT /api/vuelos/{id}` en `VueloController.java` con manejo de `VueloNoEncontradoException` (404) y `ValidacionException` (422)
- [x] 2.10 Agregar endpoint `DELETE /api/vuelos/{id}` en `VueloController.java` con manejo de `VueloNoEncontradoException` (404) y `ValidacionException` (422)
- [x] 2.11 Agregar reglas de autorización en `SecurityConfig.java` para `POST/PUT/DELETE /api/vuelos/**` requiriendo rol `OPERADOR_LOGISTICO`

## 3. Carga Masiva CSV — Backend

- [x] 3.1 Agregar logger en `CargaMasivaService.java` y registrar error en catch del método `confirmar()` con `log.error()`

## 4. Serialización y correcciones — Backend

- [x] 4.1 Agregar `@JsonProperty` en `VueloService.VueloResponse` para campos: codigo_vuelo, hora_salida, hora_llegada, capacidad_carga, carga_disponible
- [x] 4.2 Agregar campos `origen_lat`, `origen_lon`, `destino_lat`, `destino_lon` en `VueloService.VueloResponse` con sus `@JsonProperty` y mapear en `toResponse()`
- [x] 4.3 Agregar filtro `destino_iata` en `VueloService.listar()` usando Specification
- [x] 4.4 Cambiar `GlobalExceptionHandler` para que `EquipajeService.ValidacionException` retorne 422 en lugar de 400

## 5. CRUD Equipaje — Frontend

- [x] 5.1 Agregar botón ✏️ (editar) en cada equipaje de la lista — abre formulario precargado
- [x] 5.2 Agregar botón 🗑️ (eliminar) en cada equipaje de la lista — confirmación y llamada `api.delete(/equipajes/${id})` con actualización de estado local

## 6. CRUD Vuelo — Frontend

- [x] 6.1 Agregar botón "Nuevo Vuelo" al lado del botón "Individual" con formulario: código, origen, destino, hora salida, hora llegada, capacidad de carga
- [x] 6.2 Agregar botones editar/eliminar en cada vuelo de la lista (solo PROGRAMADO)

## 7. Carga Masiva CSV — Frontend

- [x] 7.1 Reemplazar `handleFileChange` para usar `FormData` con `api.upload()` en lugar de `FileReader` (ya implementado)
- [x] 7.2 Verificar que interfaz `CargaMasivaPreview` en `types.ts` coincida con `PreviewResponse` del backend (ya coincide)
- [x] 7.3 Corregir `handleConfirmarCargaMasiva` para enviar `ids_equipaje` desde `csvPreview.validos` (ya implementado)
- [x] 7.4 Agregar `ConfirmarResponse` a `types.ts` (ya existe como `CargaMasivaConfirmResponse`)
- [x] 7.5 Corregir `parseCSV()` para convertir SLA de horas a ISO 8601 (flujo reemplazado por envío al backend)

## 8. Verificación

- [x] 8.1 Verificar que el backend compile sin errores
- [x] 8.2 Verificar que el frontend compile sin errores
- [x] 8.3 Verificar integración: PUT/DELETE equipaje, POST/PUT/DELETE vuelo, carga masiva CSV (backend compila, frontend compila, cambios verificados)
