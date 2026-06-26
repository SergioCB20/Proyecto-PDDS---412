## Why

Actualmente los operadores logísticos y analistas no pueden consultar ni descargar el plan de viaje detallado de un equipaje individual. La información de ruta (segmentos, vuelos, escalas) solo existe en la base de datos y en la respuesta JSON del endpoint `GET /api/equipajes/{id}/plan-viaje`, pero no hay una interfaz que permita visualizarla ni descargarla en un formato portable (PDF). Esto limita la trazabilidad y la capacidad de compartir la información con terceros.

## What Changes

- Agregar el campo `id` (UUID del equipaje) a los DTOs `EnvioItemResponse` en BC1 y BC2 para que el frontend pueda referenciar cada equipaje individualmente
- Crear un nuevo endpoint `GET /api/equipajes/{id}/plan-viaje/descargar` que retorna un PDF con el detalle completo del plan de viaje
- Crear un servicio backend `PlanViajePdfService` que genera el PDF usando iText (misma librería que `ManifiestoService`)
- Agregar un botón de descarga (ícono) por cada equipaje listado en los paneles de envíos de Operación (`PanelEnviosOperacion`) y Simulación (`PanelEnvios`)
- Agregar función `descargarPlanViajePdf()` en el cliente HTTP del frontend

## Capabilities

### New Capabilities
- `plan-viaje-pdf`: Generación y descarga de plan de viaje en PDF por equipaje

### Modified Capabilities
- *(ninguna — solo se agrega un campo `id` a respuestas existentes sin cambiar contratos)*

## Impact

- **Backend**: Se modifica `EquipajeService.java`, `EnvioItemResponse.java` (BC2), `SesionService.java`, `EquipajeController.java`. Se crea `PlanViajePdfService.java`.
- **Frontend**: Se modifica `types.ts`, `api.ts`, `PanelEnviosOperacion.tsx`, `PanelEnvios.tsx`.
- **No hay cambios en** base de datos, migraciones Flyway, configuración de seguridad, ni dependencias nuevas.
