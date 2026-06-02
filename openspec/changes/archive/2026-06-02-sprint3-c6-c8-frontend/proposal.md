## Why

Las tareas C6 y C8 del Sprint 3 son bugs críticos de frontend que impiden el funcionamiento correcto de las vistas de Operación y Simulación:

- **C6**: El middleware de protección de rutas (`proxy.ts`) no es reconocido por Next.js porque no se llama `middleware.ts`, dejando las rutas sin protección real.
- **C8**: El mapa de operación recibe `Vuelo[]` pero `GeoMapa` espera `VueloEnMapa[]` (con campos opcionales `posicionActual` y `progreso`), causando incompatibilidad de tipos en tiempo de compilación.

## What Changes

- **Crear** `frontend/middleware.ts` con protección de rutas por rol, basado en la lógica existente de `proxy.ts`
- **Eliminar** `frontend/proxy.ts` (reemplazado por el nuevo middleware)
- **Modificar** `frontend/app/operacion/page.tsx` para mapear `Vuelo[]` → `VueloEnMapa[]` al pasar datos al componente `GeoMapa`

## Capabilities

### Modified Capabilities
- `frontend-structure.md`: El middleware ya estaba especificado pero no implementado correctamente. Se actualiza el spec para reflejar que `middleware.ts` es el archivo estándar de Next.js (no `proxy.ts`).

## Impact

- **Archivos creados**: `frontend/middleware.ts`
- **Archivos eliminados**: `frontend/proxy.ts`
- **Archivos modificados**: `frontend/app/operacion/page.tsx`
- **Sin impacto en APIs, dependencias o sistemas externos**
