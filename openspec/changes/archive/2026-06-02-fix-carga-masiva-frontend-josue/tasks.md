## 1. Actualizar tipos TypeScript

- [x] 1.1 Reemplazar `CargaMasivaPreview` en `frontend/lib/types.ts` para que coincida con `PreviewResponse` del backend (`total`, `validos`, `con_revision`, `registros[]`)
- [x] 1.2 Agregar interfaz `CargaMasivaRegistro` con campos `fila`, `id_equipaje`, `destino_iata`, `vuelo_id`, `sla_comprometido`, `estado_validacion`, `motivo`
- [x] 1.3 Agregar interfaz `CargaMasivaConfirmResponse` con campos `ingresados`, `fallidos`

## 2. Reemplazar flujo de subida de archivo

- [x] 2.1 Cambiar `handleFileChange` en `frontend/app/operacion/page.tsx` de `FileReader` a `FormData` enviando a `POST /equipajes/carga-masiva`
- [x] 2.2 Manejar error del backend en el catch de `handleFileChange`
- [x] 2.3 Guardar la respuesta `PreviewResponse` en el estado `csvPreview`

## 3. Corregir payload de confirmación

- [x] 3.1 Cambiar `handleConfirmarCargaMasiva` para enviar `{ ids_equipaje: [...] }` extrayendo IDs de registros con `estado_validacion === "VALIDO"`
- [x] 3.2 Mostrar `ingresados`/`fallidos` de la respuesta al usuario (ej. alert o mensaje en el modal)
- [x] 3.3 Refrescar datos después de confirmar

## 4. Actualizar modal de preview

- [x] 4.1 Reemplazar tabla de preview para iterar sobre `csvPreview.registros` agrupados por `estado_validacion`
- [x] 4.2 Mostrar columna `motivo` para registros con `estado_validacion === "REVISION"`
- [x] 4.3 Actualizar placeholder del input file: `sla_comprometido` en vez de `sla_horas`
- [x] 4.4 Quitar el sufijo `h` en la tabla de preview (el SLA ahora es ISO 8601, no horas sueltas)

## 5. Eliminar código obsoleto

- [x] 5.1 Eliminar función `parseCSV()` del frontend (toda la validación ahora la hace el backend)
- [x] 5.2 Eliminar import de `CargaMasivaFila` del type import si ya no se usa
- [x] 5.3 Verificar que no queden referencias a `CargaMasivaFila` en `page.tsx`
