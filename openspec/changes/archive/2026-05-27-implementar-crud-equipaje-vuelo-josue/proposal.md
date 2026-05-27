## Why

El sistema carece de endpoints para modificar y eliminar equipajes y vuelos, y la carga masiva por CSV no funciona correctamente porque el frontend nunca envía el archivo al backend. Además, existen inconsistencias de serialización (camelCase vs snake_case) en `VueloResponse`, faltan coordenadas lat/lng en la respuesta de vuelos, el filtro `destino_iata` no se aplica en la consulta de vuelos, y los códigos HTTP de error son inconsistentes (400 vs 422). Estas correcciones son necesarias para completar la funcionalidad CRUD básica y asegurar la comunicación correcta entre frontend y backend.

## What Changes

1. **CRUD Equipaje** — Agregar `PUT /api/equipajes/{id}` y `DELETE /api/equipajes/{id}` en backend + botones editar/eliminar en frontend.
2. **CRUD Vuelo** — Agregar `POST /api/vuelos`, `PUT /api/vuelos/{id}`, `DELETE /api/vuelos/{id}` en backend + botones crear/editar/eliminar en frontend.
3. **Carga Masiva CSV** — Corregir frontend para enviar el archivo al backend via `FormData`, corregir payload de confirmación, convertir SLA de horas a ISO 8601, agregar logging de errores en backend.
4. **Serialización VueloResponse** — Agregar `@JsonProperty` para snake_case y campos lat/lng de origen/destino.
5. **Filtro destino_iata** — Implementar filtro por `destino_iata` en `VueloService.listar()`.
6. **HTTP status** — Cambiar `ValidacionException` de 400 a 422 en `GlobalExceptionHandler`.

## Capabilities

### New Capabilities
- `crud-equipaje`: Operaciones de actualización y eliminación de equipajes individuales.
- `crud-vuelo`: Operaciones de creación, actualización y eliminación de vuelos.

### Modified Capabilities
- `bc1-gestion-operativa`: Se modifican los endpoints de equipajes y vuelos (nuevos métodos HTTP).
- `api-contracts`: Se actualizan los contratos de los endpoints de equipajes y vuelos existentes.

## Impact

- **Backend**: `EquipajeService.java`, `EquipajeController.java`, `VueloService.java`, `VueloController.java`, `SecurityConfig.java`, `EquipajeRepository.java`, `CargaMasivaService.java`, `GlobalExceptionHandler.java`
- **Frontend**: `frontend/app/operacion/page.tsx`, `frontend/lib/types.ts`
- **API**: Nuevos endpoints PUT/DELETE para equipajes y POST/PUT/DELETE para vuelos con reglas de autorización por rol.
