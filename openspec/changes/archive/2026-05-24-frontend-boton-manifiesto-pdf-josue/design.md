## Context

El frontend de operaciones (`app/operacion/page.tsx`) actualmente muestra un mapa interactivo con nodos y vuelos, un panel lateral con formulario de registro de equipaje, carga masiva, lista de equipajes recientes y resumen de nodos. Sin embargo, no hay forma de descargar el manifiesto PDF de cada vuelo.

El endpoint `GET /api/manifiestos/{vuelo_id}` ya está implementado en BC1 y retorna un PDF binario. El problema es que la capa de API actual (`lib/api.ts`) solo maneja respuestas JSON, no blobs/binarios.

## Goals / Non-Goals

**Goals:**
- Agregar un botón "Descargar Manifiesto PDF" por cada vuelo programado visible en el panel lateral
- Soportar descarga de archivos binarios (PDF) desde el cliente HTTP
- Manejar errores de API (404 vuelo no encontrado, 422 sin equipajes)

**Non-Goals:**
- No se modifican endpoints backend
- No se agregan nuevas dependencias npm
- No se modifica el mapa ni otras secciones del panel

## Decisions

1. **Nuevo método `downloadBlob` en `api.ts` en vez de modificar `get`**
   - Alternativa considerada: agregar `responseType` como parámetro a `get`
   - Decisión: método separado es más explícito y evita romper llamadas JSON existentes
   - El método usa `fetch` directo con manejo de errores consistente con el resto de la API

2. **Sección "Vuelos Programados" en el sidebar en vez de modal o página separada**
   - Alternativa considerada: botón de descarga en el vuelo del mapa (tooltip)
   - Decisión: el sidebar es el panel de control de operación, mantener contexto ahí es más usable
   - Se usa `.slice(0, 20)` para no saturar visualmente el panel angosto

3. **Descarga via `URL.createObjectURL` + click en `<a>` temporal**
   - Es el patrón estándar para descarga de blobs en el navegador
   - No requiere librerías externas

## Risks / Trade-offs

- [Riesgo] Sidebar con más de 20 vuelos programados se verá saturado → Mitigación: límite de 20 + scroll natural del contenedor
- [Riesgo] El popup/bloqueador de popups del navegador no afecta este método de descarga → No aplica (es un click programático en un elemento DOM, no `window.open`)
- [Riesgo] Archivos PDF grandes (>10MB) podrían tener latencia → El blob se descarga completo antes de disparar el download, lo cual es el comportamiento esperado
