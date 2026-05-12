## Why

La página de reporte de simulación (`/simulacion/[id]/reporte`) no existe actualmente. Los analistas necesitan visualizar los resultados de una simulación finalizada: gráfico SLA vs tiempo, métricas resumen (SLA%, replanificadas, punto de colapso) para evaluar el desempeño logístico. Esta es la tarea C1 del plan de trabajo del frontend, prioridad alta y sin dependencias de backend (usa mock data inicialmente).

## What Changes

- Crear la ruta `/simulacion/[id]/reporte` con una página que muestre:
  - Tarjetas de resumen: SLA incumplido %, total maletas replanificadas, punto de colapso, causa de colapso
  - Gráfico lineal (Recharts `LineChart`) con la serie `serie_sla` (eje X: `momento_virtual`, eje Y: `sla_pct` 0-100%)
  - Marcadores rojos en puntos donde `hubo_cancelacion = true`
- Agregar mock data para `ReporteSesion` en `lib/mock.ts`
- Usar patrón `.catch(() => MOCK_DATA)` para fallback

## Capabilities

### New Capabilities
- `pagina-reporte-simulacion`: Página de reporte final con gráfico SLA y tarjetas de resumen para simulaciones de enrutamiento de equipaje

### Modified Capabilities

*(ninguna — es una capacidad nueva)*

## Impact

- **Nuevo archivo:** `frontend/app/simulacion/[id]/reporte/page.tsx`
- **Modificación:** `frontend/lib/mock.ts` (agregar `MOCK_REPORTE_SESION` y `MOCK_SERIE_SLA`)
- **Dependencia npm:** `recharts` (ya listada en frontend-structure.md)
- **Sin impacto en backend** (usa mock data con patrón de fallback)
