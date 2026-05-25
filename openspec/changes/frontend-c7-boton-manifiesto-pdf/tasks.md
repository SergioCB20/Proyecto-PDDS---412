## 1. API layer — método downloadBlob

- [x] 1.1 Agregar método `downloadBlob(path)` en `frontend/lib/api.ts` que use `fetch` con headers de autenticación y retorne `res.blob()`
- [x] 1.2 Mantener manejo de errores consistente con el resto de la API (lanzar objeto con `status`, `error`, `mensaje`)

## 2. OperacionPage — handler de descarga

- [x] 2.1 Agregar estado `manifestLoading: string | null` para controlar loading por vuelo
- [x] 2.2 Implementar `handleDescargarManifiesto(vuelo: Vuelo)` que llame `api.downloadBlob`, cree un `URL.createObjectURL`, dispare el download con nombre `manifiesto_{codigo_vuelo}_{fecha}.pdf`, y limpie el objeto URL
- [x] 2.3 Manejar errores: alerta "Vuelo no encontrado" en 404, alerta "El vuelo no tiene equipajes registrados" en 422, y error genérico en otros casos
- [x] 2.4 Agregar import de `Download` desde `lucide-react`

## 3. OperacionPage — sección Vuelos Programados en UI

- [x] 3.1 Agregar bloque JSX después de "Equipajes Recientes" y antes de "Resumen de Nodos" que renderice los `vuelosProgramados` (máximo 20 con `.slice(0, 20)`)
- [x] 3.2 Cada item debe mostrar: código de vuelo, ruta (origen → destino), y botón con icono `Download` que ejecute `handleDescargarManifiesto`
- [x] 3.3 Deshabilitar el botón y mostrar animación pulse mientras `manifestLoading === vuelo.id`

## 4. Verificación

- [x] 4.1 Ejecutar `npm run build` en frontend — sin errores de compilación
- [ ] 4.2 Verificar que el botón descarga un PDF correctamente contra backend real (requiere backend corriendo)
