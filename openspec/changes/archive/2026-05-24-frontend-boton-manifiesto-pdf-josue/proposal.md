## Why

El endpoint `GET /manifiestos/{vuelo_id}` ya existe y está funcional desde BC1 (tarea A4 completada), pero el frontend de operaciones no tiene forma de descargar el manifiesto PDF de cada vuelo. Esto deja incompleta la funcionalidad para el rol OPERADOR_LOGISTICO.

## What Changes

- Agregar método `downloadBlob` en `lib/api.ts` para descargar PDFs (el método `get` actual solo soporta JSON)
- Agregar sección "Vuelos Programados" en el sidebar de `app/operacion/page.tsx` con un botón de descarga de manifiesto PDF por cada vuelo
- El botón descarga el PDF con el nombre `manifiesto_{codigo_vuelo}_{fecha}.pdf`
- Manejo de errores: 404 (vuelo no encontrado) y 422 (sin equipajes registrados)

## Capabilities

### New Capabilities
<!-- Ninguna — esta tarea implementa una capacidad ya especificada en api-contracts.md -->

### Modified Capabilities
<!-- Ninguna — no cambian requisitos a nivel de spec, solo implementación frontend -->

## Impact

- `frontend/lib/api.ts` — nuevo método `downloadBlob` para descargas binarias
- `frontend/app/operacion/page.tsx` — nueva sección UI + handler de descarga
- Sin cambios en el backend — la API ya está lista
- Sin nuevas dependencias npm
