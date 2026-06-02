## Context

En `simulacion/[id]/page.tsx:80`, el mapeo de `VueloTelemetria` a `VueloEnMapa` usa un casteo directo `v.estado as VueloEnMapa['estado']`. `VueloTelemetria.estado` es `string` (viene del backend via WebSocket), mientras que `VueloEnMapa.estado` hereda de `Vuelo.estado` que es la union literal `'PROGRAMADO' | 'EN_RUTA' | 'CANCELADO' | 'COMPLETADO'`. TypeScript no valida esta conversion en runtime.

## Goals / Non-Goals

**Goals:**
- Eliminar el casteo forzado sin validacion
- Proveer un fallback seguro si el backend envia un valor desconocido
- Mantener el tipo estricto en `VueloEnMapa.estado`

**Non-Goals:**
- Cambiar la estructura de tipos existente (`Vuelo`, `VueloEnMapa`, `VueloTelemetria`)
- Modificar el backend o el WebSocket

## Decisions

1. **Funcion local vs util compartida**: Funcion definida localmente en `page.tsx` porque solo se usa en este archivo. Si aparece en mas lugares, se extrae a `lib/utils.ts` en el futuro.
2. **Fallback a `PROGRAMADO`**: Es el estado inicial mas seguro. El mapa no mostrara un avion en vuelo erroneamente, y la animacion comenzara desde el origen.
3. **Validacion con `includes` sobre array constante**: Mas legible y mantenible que un `switch` largo. El array `as const` permite inferencia de tipos para la comprobacion.

## Risks / Trade-offs

- [Bajo] Si el backend agrega un nuevo estado valido, hay que actualizar el array `VALIDOS` y el tipo `Vuelo.estado`. Esto es intencional — el error de compilacion forzara al desarrollador a decidir el fallback.
- [Bajo] `matchEstadoVuelo` queda en el mismo archivo que la vista. Si se reusa en otros componentes, habra duplicacion menor hasta refactorizar a `lib/utils.ts`.
