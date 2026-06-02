## Context

El frontend del proyecto TAS FB2B usa Next.js 16 con React 19. El cliente HTTP centralizado en `lib/api.ts` tiene 3 puntos de fetch (`request()`, `upload()`, `downloadBlob()`) que actualmente no implementan timeout, lo que significa que una petición puede quedar colgada indefinidamente si el backend no responde. Por otro lado, la página de reporte en `app/simulacion/[id]/reporte/page.tsx` usa `useParams()` de Next.js 16, que internamente resuelve de forma asíncrona y requiere un `<Suspense>` boundary padre; sin él, Next.js lanza un error en tiempo de ejecución.

## Goals / Non-Goals

**Goals:**
- Implementar timeout de 15 segundos en todos los fetch calls de `api.ts` usando `AbortController`
- Envolver `ReportePage` en un `<Suspense>` boundary con fallback visual
- Mantener compatibilidad total con el código existente
- Pasar `npm run build` sin errores

**Non-Goals:**
- No se modifica la lógica de negocio de ningún componente
- No se agregan nuevas dependencias npm
- No se cambia la estructura de tipos ni contratos API
- No se implementa reconexión automática ni retry logic

## Decisions

1. **AbortController nativo vs librería externa**: Se usa `AbortController` (nativo del navegador y Node 16+) en lugar de agregar `axios` o `ky`. **Razón**: cero dependencias nuevas, API estándar, suficiente para el caso de uso. `AbortController.timeout()` static no está disponible en todos los targets; se prefiere `setTimeout` + `controller.abort()` manual para máxima compatibilidad.

2. **Timeout de 15s**: Valor estándar usado en la industria para APIs REST. Suficiente para operaciones del backend (BC1/BC2) sin ser demasiado agresivo. Se define como constante `REQUEST_TIMEOUT_MS` para facilitar cambios futuros.

3. **Suspense boundary en página de reporte**: Se crea un wrapper funcional que envuelve el componente interno. **Alternativa**: usar `loading.tsx` de Next.js. **Decisión**: wrapper inline porque la página ya maneja su propio loading state para la carga de datos; el Suspense es solo para resolver `useParams()`, no para el fetch. Un `loading.tsx` aplicaría a toda la ruta y sería menos granular.

4. **Manejo de `upload()` timeout**: Aunque subir archivos puede tomar más de 15s, el endpoint de upload no está definido como de archivos grandes en el proyecto actual. Se aplica el mismo timeout por consistencia. Si en el futuro se necesitan uploads lentos, se puede sobrescribir por llamada.

## Risks / Trade-offs

- **[Riesgo Bajo]** Timeout de 15s puede ser insuficiente si el backend está bajo carga pesada → El usuario recibe un error 408/AbortError en lugar de una espera indefinida, que es el comportamiento deseado.
- **[Riesgo Muy Bajo]** Si algún consumer de `api.ts` ya pasa su propio `signal` en `options`, se solaparía con el nuevo `AbortController` → El diseño mergea `options` con el signal interno, dando prioridad al signal externo si existe. No hay colisión porque `fetch` ignora signals duplicados.
- **[Riesgo Bajo]** El wrapper de Suspense añade un nivel de anidamiento mínimo → No afecta rendimiento ni accesibilidad.
