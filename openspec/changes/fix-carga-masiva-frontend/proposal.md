## Why

El frontend actualmente procesa la carga masiva de equipajes (CSV) completamente del lado cliente, parseando el archivo con `FileReader.readAsText` y enviando datos crudos al endpoint de confirmación. Esto no coincide con la API del backend, que ya expone `POST /equipajes/carga-masiva` para recibir el archivo y devolver un preview validado. Como resultado, el flujo de carga masiva nunca funciona — el backend nunca recibe el archivo, el payload de confirmación tiene el formato incorrecto, y el SLA se envía como horas sueltas en vez de ISO 8601.

## What Changes

- El frontend enviará el archivo CSV al backend mediante `FormData` a `POST /equipajes/carga-masiva` en lugar de parsearlo en cliente
- El frontend ajustará el payload de `POST /equipajes/carga-masiva/confirmar` para que coincida con `{ ids_equipaje: [...] }`
- El frontend convertirá el SLA de horas a ISO 8601 antes de enviar
- Se actualizarán los tipos TypeScript `CargaMasivaPreview` y `CargaMasivaFila` para reflejar la respuesta real del backend
- Se eliminará la función `parseCSV()` del frontend ya que la validación pasa al backend

## Capabilities

### New Capabilities

- *(ninguna — es una corrección sobre funcionalidad existente)*

### Modified Capabilities

- `carga-masiva`: El flujo de integración frontend para carga masiva de equipajes cambia de parseo 100% client-side a delegar la validación al backend, alineándose con los contratos API existentes (`POST /equipajes/carga-masiva` y `POST /equipajes/carga-masiva/confirmar`)

## Impact

- `frontend/lib/types.ts` — actualizar interfaces `CargaMasivaPreview` y `CargaMasivaFila`
- `frontend/app/operacion/page.tsx` — reemplazar `handleFileChange`, `parseCSV`, `handleConfirmarCargaMasiva`, y la UI del modal de preview
- Sin cambios en backend — todos los endpoints ya funcionan correctamente
