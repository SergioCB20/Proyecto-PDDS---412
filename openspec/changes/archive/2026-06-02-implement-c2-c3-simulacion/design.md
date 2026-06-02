## Context

La simulación se configura en `/simulacion` y se ejecuta en `/simulacion/[id]`. Actualmente el formulario de configuración genera un ID fake con `Math.random()` para la URL, y la telemetría se obtiene por duplicado vía WebSocket y polling simultáneos.

## Goals / Non-Goals

**Goals:**
- Crear sesiones reales contra `POST /api/sesiones` y usar el UUID devuelto en la URL
- Leer `params.id` en la página de simulación en vivo
- Que el polling `fetchMetricas` solo corra como fallback cuando WebSocket está desconectado

**Non-Goals:**
- No se modifica el hook `useTelemetria` ni la lógica de reconexión WS
- No se toca `api.ts` ni `proxy.ts`
- No se implementa SSE (ya existe como funcionalidad separada)

## Decisions

1. **`handleIniciar` async con `POST /api/sesiones`** — En lugar de generar un ID local, se llama al backend y se redirige con el UUID real. Se preserva la configuración en query params para que la pantalla de simulación la lea con `useSearchParams`.
2. **`useParams` en `[id]/page.tsx`** — Se usa `useParams` de `next/navigation` para obtener `params.id` en lugar de depender de `useSearchParams`. Se elimina `FALLBACK_SIM_ID`.
3. **Polling condicional a `connected`** — El `useEffect` del polling agrega `connected` (retornado por `useTelemetria`) a sus dependencias. Si `connected === true`, se limpia el intervalo; si `connected === false`, se inicia el polling cada 3s como fallback.

## Risks / Trade-offs

- **Riesgo: POST /api/sesiones falla (503, timeout)** → Se muestra error al usuario, no se redirige. Mantener UX actual de spinner/error.
- **Riesgo: Sesión creada pero el UUID no es válido para WS** → El hook `useTelemetria` ya maneja reconexión, no hay cambio.
- **Trade-off: Polling como fallback** → Si WS está caído, la UI se actualiza cada 3s en vez de en tiempo real, lo cual es aceptable para un escenario de degradación.
