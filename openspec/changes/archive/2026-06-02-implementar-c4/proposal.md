## Why

La vista de simulacion en `simulacion/[id]/page.tsx` usa un casteo forzado (`as VueloEnMapa['estado']`) para convertir el campo `estado` de `VueloTelemetria` (tipo `string`) al tipo literal union esperado por `VueloEnMapa`. Si el backend devuelve un valor inesperado, el error se silencia y puede propagarse al mapa como estado invalido.

## What Changes

- Agregar funcion `matchEstadoVuelo()` con validacion runtime que recibe un `string` y retorna el tipo seguro `'PROGRAMADO' | 'EN_RUTA' | 'CANCELADO' | 'COMPLETADO'`, con fallback a `'PROGRAMADO'`
- Reemplazar el cast `v.estado as VueloEnMapa['estado']` en el `useMemo` de `vuelos` por la llamada a `matchEstadoVuelo(v.estado)`

## Capabilities

### New Capabilities
<!-- No new capabilities -- this is a bug fix within an existing view. -->

### Modified Capabilities
- `frontend-structure`: Agregar directriz sobre casteo seguro con validacion runtime para campos `estado` provenientes del backend

## Impact

- `frontend/app/simulacion/[id]/page.tsx` — unica modificacion (agregar funcion helper + reemplazar cast)
- No afecta tipos, APIs, ni otros componentes
