## Context

El sistema ya cuenta con:

- Endpoint `GET /api/equipajes/{id}/plan-viaje` que devuelve `PlanViajeDetalleResponse` con segmentos, ubicación actual y estado SLA del equipaje.
- Servicio `ManifiestoService` que genera PDFs con iText (Lowagie) para manifiestos de vuelo — patrón comprobado de generación PDF.
- DTOs `EnvioItemOperacionResponse` (BC1) y `EnvioItemResponse` (BC2) que listan equipajes en los paneles de envíos, pero **sin incluir el UUID del equipaje**, necesario para llamar al endpoint de plan de viaje.
- Componentes frontend `PanelEnviosOperacion` y `PanelEnvios` que renderizan listas de equipaje con código, origen → destino y cantidad.

## Goals / Non-Goals

**Goals:**
- Habilitar descarga de plan de viaje en PDF para cualquier equipaje en los módulos de Operación y Simulación
- El PDF debe contener: código de equipaje, aeropuerto origen, ruta completa (segmentos ordenados con vuelo, origen → destino, hora), aeropuerto destino, cantidad de maletas y estado SLA
- Agregar el UUID del equipaje a las respuestas de listado de envíos para que el frontend pueda referenciarlo

**Non-Goals:**
- No modificar el comportamiento actual de los listados de envíos
- No agregar nuevas dependencias (iText ya existe en el proyecto)
- No modificar la base de datos ni migraciones Flyway
- No implementar autenticación adicional ni protección de roles (hereda la existente)

## Decisions

### 1. Formato de descarga: PDF vs JSON vs CSV
**Decisión:** PDF (server-side con iText).
- El usuario necesita un documento portable, profesional y compartible.
- **Alternativa:** Generar HTML client-side e imprimir. Descartado porque requiere más lógica en frontend y el resultado es menos consistente.
- **Alternativa:** CSV. Descartado porque la información jerárquica (segmentos) no se presta bien a formato tabular plano.

### 2. Server-side vs client-side generation
**Decisión:** Server-side PDF usando `PlanViajePdfService`.
- Reutiliza el mismo patrón y librería de `ManifiestoService`.
- El endpoint devuelve `application/pdf` con `Content-Disposition: attachment`.
- El frontend solo necesita un botón que llama al endpoint y descarga el blob.

### 3. Inclusión del UUID en DTOs de envíos
**Decisión:** Agregar `UUID id` a `EnvioItemOperacionResponse` (BC1) y `EnvioItemResponse` (BC2).
- Es el identificador necesario para consultar el plan de viaje por equipaje.
- No rompe compatibilidad: es un field adicional opcional para consumidores existentes.
- **Alternativa:** Usar `codigo_equipaje` (idExterno) como lookup. Descartado porque no hay un endpoint que resuelva idExterno → UUID de manera estándar.

### 4. Botón de descarga en UI
**Decisión:** Ícono `FileDown` de lucide-react por cada fila de equipaje.
- Mínimo impacto visual, consistente con el diseño actual de los paneles.
- Al hacer clic, llama a `descargarPlanViajePdf(id)` que usa `api.downloadBlob()` y abre el PDF en nueva pestaña.

## Risks / Trade-offs

- **[PDF no generado si no hay plan de viaje]** → El endpoint `obtenerDetallePlanViaje` lanza `ValidacionException("Plan de viaje no encontrado")`. El controller devuelve 422 y el frontend muestra un error silencioso (toast o alerta).
- **[Sobrecarga de PDF en listas grandes]** → La descarga es individual (un equipaje a la vez), no hay riesgo de batch.
- **[iText thread-safety]** → `Document` no es thread-safe, pero cada request crea una instancia nueva de `Document` y `ByteArrayOutputStream`, no hay estado compartido.
