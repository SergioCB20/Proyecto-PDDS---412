## 1. Backend — Agregar UUID a DTOs de envíos

- [x] 1.1 En `EquipajeService.java` (BC1), agregar `UUID id` al record `EnvioItemOperacionResponse`
- [x] 1.2 En `EquipajeService.java`, actualizar `obtenerEnviosVuelo()` y `obtenerEnviosNodo()` para incluir `e.getId()` en el response
- [x] 1.3 En `EnvioItemResponse.java` (BC2), agregar `UUID id` al record
- [x] 1.4 En `SesionService.java` (BC2), actualizar `obtenerEnviosVuelo()` y `obtenerEnviosNodo()` para incluir `e.getId()` en el response

## 2. Backend — Crear PlanViajePdfService

- [x] 2.1 Crear `backend/backend/src/main/java/com/tasfb2b/backend/bc1/application/PlanViajePdfService.java`
- [x] 2.2 Inyectar `EquipajeService` para reusar `obtenerDetallePlanViaje()` que devuelve `PlanViajeDetalleResponse`
- [x] 2.3 Implementar método `generarPdf(UUID equipajeId)` que genera PDF con iText con:
  - Título "PLAN DE VIAJE"
  - Código del equipaje, cantidad de maletas, origen, destino
  - Estado SLA y tiempo estimado de entrega
  - Tabla de segmentos (orden, vuelo, origen→destino, hora salida)
  - Total de segmentos

## 3. Backend — Agregar endpoint de descarga

- [x] 3.1 En `EquipajeController.java`, agregar `@GetMapping("/{id}/plan-viaje/descargar")` que llama a `PlanViajePdfService.generarPdf()`
- [x] 3.2 Configurar headers: `Content-Type: application/pdf`, `Content-Disposition: attachment`
- [x] 3.3 Manejar errores: 404 si equipaje no existe, 422 si no tiene plan de viaje

## 4. Frontend — Actualizar tipos y API

- [x] 4.1 En `frontend/lib/types.ts`, agregar campo `id: string` a `EnvioItemResponse`
- [x] 4.2 En `frontend/lib/api.ts`, agregar función `descargarPlanViajePdf(equipajeId: string): Promise<void>`

## 5. Frontend — Botón de descarga en Paneles de Envíos

- [x] 5.1 En `PanelEnviosOperacion.tsx`, agregar botón con ícono `FileDown` de lucide-react por cada fila de equipaje
- [x] 5.2 En `PanelEnvios.tsx` (simulación), agregar mismo botón con ícono `FileDown`
- [x] 5.3 Manejar error en la descarga con `alert()` o mensaje visual
