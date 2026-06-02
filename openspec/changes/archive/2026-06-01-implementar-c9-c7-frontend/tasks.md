## 1. C7 — Timeout en api.ts

- [x] 1.1 Agregar constante `REQUEST_TIMEOUT_MS = 15_000` en `lib/api.ts`
- [x] 1.2 Modificar función `request()` para crear `AbortController` con timeout de 15s, pasar `signal` al fetch, y limpiar con `clearTimeout` en un bloque `finally`
- [x] 1.3 Modificar método `api.upload()` para aplicar el mismo timeout con `AbortController`
- [x] 1.4 Modificar método `api.downloadBlob()` para aplicar el mismo timeout con `AbortController`

## 2. C9 — Suspense boundary en reporte

- [x] 2.1 Renombrar `ReportePage` a `ReportePageInner` en `app/simulacion/[id]/reporte/page.tsx`
- [x] 2.2 Agregar `import { Suspense } from 'react'`
- [x] 2.3 Crear nuevo `export default function ReportePage()` que envuelva `<ReportePageInner>` en `<Suspense fallback={...}>` con el mismo texto de carga existente

## 3. Verificación

- [x] 3.1 Ejecutar `npm run build` y verificar que no haya errores de compilación
- [x] 3.2 Ejecutar `npm run lint` y verificar que no haya errores de lint
