## Why

Las vistas de Simulación y Operación del frontend presentan bugs de calidad y estabilidad: el cliente HTTP (`api.ts`) no tiene timeout, lo que puede dejar peticiones colgadas indefinidamente, y la página de reporte (`reporte/page.tsx`) carece de un Suspense boundary, lo que causa errores en Next.js 16 al usar `useParams()` sin envolverlo en `<Suspense>`. Se corrigen ambos para garantizar robustez y compatibilidad con la versión de Next.js del proyecto.

## What Changes

- **C7 — Timeout en api.ts**: Agregar `AbortController` con timeout de 15 segundos a los 3 puntos de fetch (`request()`, `upload()`, `downloadBlob()`) en `lib/api.ts` para evitar peticiones colgadas.
- **C9 — Suspense boundary en reporte**: Envolver el componente `ReportePage` en un `<Suspense>` boundary con fallback de carga en `app/simulacion/[id]/reporte/page.tsx` para cumplir con el requisito de Next.js 16 de que componentes que usan `useParams()` tengan un Suspense padre.

## Capabilities

### New Capabilities
_(Ninguna — son correcciones sobre capacidades existentes)_

### Modified Capabilities
- `frontend-structure`: Se modifica la implementación del cliente HTTP (`lib/api.ts`) para incluir timeout y se añade Suspense boundary a la página de reporte. No cambian requisitos de contrato.
- `sse-frontend-consumo`: No se modifica. El timeout en `api.ts` aplica a todos los endpoints HTTP, incluyendo los de SSE, pero no altera el comportamiento del streaming SSE.

## Impact

- **Archivos modificados**: `frontend/lib/api.ts`, `frontend/app/simulacion/[id]/reporte/page.tsx`
- **Dependencias**: Ninguna nueva. Uso de `AbortController` (nativo del navegador/Node 16+) y `Suspense` (React 19).
- **Breaking**: Ninguno. Compatibilidad total hacia atrás.
- **Riesgo**: Bajo. Cambios acotados a 2 archivos, sin efectos colaterales en otras rutas o componentes.
