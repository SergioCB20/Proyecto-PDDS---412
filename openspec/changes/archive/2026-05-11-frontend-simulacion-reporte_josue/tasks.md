## 1. Setup y dependencias

- [x] 1.1 Instalar `recharts` en el frontend: `npm install recharts`
- [x] 1.2 Verificar que el tipo `ReporteSesion` y `PuntoSLA` existen en `lib/types.ts`

## 2. Mock data para el reporte

- [x] 2.1 Agregar `MOCK_REPORTE_SESION` en `lib/mock.ts` con datos de ejemplo (SLA%, replanificadas, punto/causa de colapso, serie de 20+ puntos)
- [x] 2.2 Exportar `MOCK_REPORTE_SESION` desde `lib/mock.ts`

## 3. Página de reporte

- [x] 3.1 Crear `app/simulacion/[id]/reporte/page.tsx` con `'use client'`
- [x] 3.2 Implementar fetch con patrón `.catch(() => MOCK_REPORTE_SESION)` para obtener datos
- [x] 3.3 Renderizar 4 tarjetas de resumen (SLA incumplido %, replanificadas, punto de colapso, causa de colapso) usando el componente `Card`
- [x] 3.4 Renderizar `LineChart` de Recharts con `serie_sla` (eje X: `momento_virtual`, eje Y: `sla_pct`)
- [x] 3.5 Agregar marcadores rojos en puntos donde `hubo_cancelacion = true` usando `dot` personalizado en Recharts
- [x] 3.6 Agregar tooltip personalizado que muestre `momento_virtual`, `sla_pct` y estado de cancelación

## 4. Verificación

- [x] 4.1 Probar que la página carga en `http://localhost:3000/simulacion/test-id/reporte`
- [x] 4.2 Probar que las tarjetas muestran datos correctos del mock
- [x] 4.3 Probar que el gráfico renderiza la serie completa con marcadores rojos
- [x] 4.4 Ejecutar `npm run build` (o `npm run lint`) para verificar que no hay errores de compilación
