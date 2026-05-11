## Context

Actualmente el frontend tiene la ruta `/simulacion/[id]` con métricas en vivo (polling cada 3s), botones de control y un mapa Leaflet. Cuando la simulación termina (estado `FINALIZADA`), el analista necesita un reporte consolidado. No existe la ruta `/simulacion/[id]/reporte` ni el componente de reporte. El backend BC2 (ReporteService + MetricasController) está en desarrollo (0%), por lo que la página debe funcionar inicialmente con mock data usando el patrón de fallback `.catch(() => MOCK_DATA)`.

La especificación está en `openspec/specs/frontend-structure.md` sección "`/simulacion/[id]/reporte` (Analista)" y en `TAREAS_FRONTEND.md` tarea C1.

## Goals / Non-Goals

**Goals:**
- Crear la página `/simulacion/[id]/reporte` con datos mock
- Mostrar 4 tarjetas de resumen: SLA incumplido %, total replanificadas, punto de colapso, causa de colapso
- Mostrar gráfico Recharts `LineChart` con `serie_sla` (eje X: `momento_virtual`, eje Y: `sla_pct`)
- Marcar en rojo los puntos donde `hubo_cancelacion = true`
- Agregar mock data de `ReporteSesion` en `lib/mock.ts`
- Usar patrón `.catch(() => MOCK_DATA)` para que al conectar al backend solo cambie la llamada API

**Non-Goals:**
- No incluye la conexión al backend real (`GET /sesiones/{id}/reporte`) — eso es tarea futura (Backend B8)
- No incluye el botón "Ver Reporte" en `/simulacion/[id]` — eso es tarea C6 separada
- No incluye WebSocket ni telemetría en tiempo real

## Decisions

| Decisión | Opción elegida | Alternativas | Razón |
|---|---|---|---|
| Librería de gráficos | Recharts `LineChart` | Chart.js, D3.js | Ya especificada en frontend-structure.md, más declarativa con React |
| Patrón de datos mock | `MOCK_REPORTE_SESION` en `lib/mock.ts` + fetch con `.catch(() => MOCK_DATA)` | Pasar mock como prop, usar contexto | Sigue el patrón existente del proyecto (ver `tickMetricasMock`) y facilita migración a API real |
| Ruta | `app/simulacion/[id]/reporte/page.tsx` | Ruta plana `/reporte` | Sigue la estructura de App Router de Next.js y anida bajo la simulación |
| Parámetro de sesión | `params.id` (dinámico de la ruta) | `searchParams` | La ruta anidada da acceso directo al `id` de la sesión via `params` |
| Estado del gráfico | Client component con `useState` + `useEffect` | Server component con fetch | Necesita interactividad y Recharts requiere cliente |

## Risks / Trade-offs

- **[Riesgo]** Recharts no está instalado actualmente → **Mitigación:** Incluir en tareas la instalación con `npm install recharts`
- **[Riesgo]** La estructura de `ReporteSesion` del backend podría cambiar cuando BC2 esté implementado → **Mitigación:** El tipo `ReporteSesion` ya está definido en `lib/types.ts` según frontend-structure.md; el mock se alinea a ese tipo
- **[Trade-off]** Usar `params.id` asume que la ruta es `/simulacion/[id]/reporte` y que `id` se pasa como parámetro dinámico, no como query string
