## Context

El frontend de la página de operación (`frontend/app/operacion/page.tsx`) implementa un flujo de carga masiva que parsea el CSV completamente en el cliente usando `FileReader.readAsText` + `parseCSV()`. Este enfoque tiene tres problemas:

1. **Nunca llama a `POST /equipajes/carga-masiva`** — el backend ya tiene un endpoint que recibe `multipart/form-data`, valida el CSV contra la BD (UUIDs, existencias, estados), y devuelve un preview estructurado. El frontend lo ignora por completo.
2. **Payload de confirmación incorrecto** — el backend espera `{ ids_equipaje: ["MAL-001", ...] }` pero el frontend envía `{ equipajes: [{...objetos}] }`.
3. **SLA en formato incorrecto** — el frontend trata SLA como horas sueltas (`parseInt`), el backend espera ISO 8601 (`OffsetDateTime.parse`).

El backend (`EquipajeController.java`, `CargaMasivaService.java`) ya funciona correctamente para ambos endpoints. Solo se requiere corregir el frontend.

## Goals / Non-Goals

**Goals:**
- Que el flujo de carga masiva funcione correctamente de punta a punta
- Alinear el frontend con los contratos API existentes (`api-contracts.md` líneas 253-297)
- Eliminar lógica duplicada de validación CSV del frontend

**Non-Goals:**
- No se modificará el backend (controllers, services, repositories)
- No se agregarán nuevas funcionalidades — solo corrección del flujo existente
- No se cambiarán flujos existentes que funcionan (registro individual, manifiesto PDF)

## Decisions

| Decisión | Opción elegida | Alternativa descartada |
|---|---|---|
| **Envío del archivo** | `FormData` vía `api.post()` | Seguir usando `FileReader` + parseo client-side (descartado porque duplica lógica de validación y nunca alimenta el `previewStore` del backend) |
| **Payload confirmar** | La función extrae solo `ids_equipaje` del preview backend | Enviar todo el objeto registro (descartado porque el backend solo espera IDs) |
| **Conversión SLA** | `new Date().setHours(horas)` → `.toISOString()` | Dejar que el backend reciba horas sueltas (descartado porque `OffsetDateTime.parse` fallaría) |
| **Tipos TypeScript** | `CargaMasivaPreview` se alinea con `PreviewResponse` del backend | Mantener el tipo actual incompatible (descartado porque el modal de preview no mostraría los datos correctamente) |

## Risks / Trade-offs

- **[Riesgo bajo] Error al subir archivo**: Si el backend devuelve error, el frontend debe mostrar el mensaje al usuario. Ya hay manejo de errores en el catch existente.
- **[Riesgo bajo] Carga de archivos grandes**: El backend procesa el CSV línea por línea con `BufferedReader`, no hay riesgo de OOM en el frontend.
- **[Trade-off] Se pierde preview instantáneo**: Antes el preview era inmediato (100% client-side). Ahora requiere round-trip al backend. A cambio, la validación es correcta (contra la BD real).
