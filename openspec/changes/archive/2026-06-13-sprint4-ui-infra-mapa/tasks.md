## 1. Backend — Cambio compartido B1

- [x] 1.1 Agregar `fecha_inicio_real` (OffsetDateTime) al record `MetricasSesionResponse.java`
- [x] 1.2 Actualizar `TickService.buildMetricasJson()` para incluir `fecha_inicio_real` en el JSON de Redis
- [x] 1.3 Actualizar `SesionService.obtenerMetricas()` para mapear `fecha_inicio_real` desde Redis cache y desde entidad JPA

## 2. Frontend — Sidebar colapsable (T1)

- [x] 2.1 Agregar estado `isCollapsed` y botón de toggle con ícono en `SimulacionContent`
- [x] 2.2 Implementar layout condicional: `w-80` (expandido) vs `w-12` (colapsado) con animación
- [x] 2.3 Mostrar indicadores mínimos en estado colapsado (badge estado + telemetría)
- [x] 2.4 Actualizar `MetricasSimulacion` en types.ts si es necesario

## 3. Frontend — Colores de nodos y popups de vuelo (T2, T3)

- [x] 3.1 Verificar que `GeoMapaNodo.tsx` usa correctamente `nodo.color` del backend (T2)
- [x] 3.2 Agregar `Popup` de Leaflet al marker en `AvionAnimado.tsx` con código, ocupación %, capacidad (T3)
- [x] 3.3 Agregar colores de fondo verde/ámbar/rojo en el popup según `ocupacion_pct`

## 4. Frontend — Fechas reales (T4, T5)

- [x] 4.1 Agregar campo `fecha_inicio_real` a `MetricasSimulacion` en types.ts
- [x] 4.2 Mostrar fecha/hora REAL de inicio en la UI usando `fecha_inicio_real` de métricas (T4)
- [x] 4.3 Calcular y mostrar fecha/hora REAL actual como `fechaInicioReal + segundosRealesTranscurridos` (T5)
- [x] 4.4 Implementar congelamiento de fecha real al detectar estado `FINALIZADA`

## 5. Frontend — Fechas virtuales (T6, T7)

- [x] 5.1 Mostrar fecha/hora VIRTUAL de inicio desde `searchParams` de la URL (T6)
- [x] 5.2 Mostrar `dia_hora_virtual` como fecha virtual actual (T7)
- [x] 5.3 Implementar congelamiento de fecha virtual al llegar a `FINALIZADA`

## 6. Frontend — Líneas curvas en rutas de vuelo (T8)

- [x] 6.1 Implementar función `calcularCurvaBezier(origen, destino)` que genere 50 puntos interpolados con offset perpendicular
- [x] 6.2 Actualizar `GeoMapaVuelo.tsx` para usar la curva bezier en lugar de `Polyline` recto
