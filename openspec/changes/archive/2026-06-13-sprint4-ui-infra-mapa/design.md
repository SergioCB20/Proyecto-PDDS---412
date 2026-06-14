## Context

La vista de simulación en vivo (`/simulacion/[id]`) es la pantalla principal del Analista para monitorear la ejecución de una sesión SIMULADA. Actualmente tiene un panel derecho fijo de 320px (`w-80`), mapa con nodos y vuelos, y métricas básicas. Se requieren mejoras sustanciales en usabilidad (sidebar colapsable), visualización (colores de ocupación en nodos/vuelos, popups, rutas curvas) e información temporal (fechas reales y virtuales).

El backend expone `GET /sesiones/{id}/metricas` que retorna `MetricasSesionResponse` y telemetría vía WebSocket (`TelemetriaMensaje`). Se necesita agregar `fecha_inicio_real` al DTO de métricas (B1) para poder calcular fechas reales en el frontend.

## Goals / Non-Goals

**Goals:**
- Sidebar derecho colapsable con animación y estado reducido (T1)
- Círculos de nodo y popups de vuelo con color verde/ámbar/rojo según ocupación (T2, T3)
- Visualización de fecha/hora real de inicio y actual (T4, T5)
- Visualización de fecha/hora virtual de inicio y actual (T6, T7)
- Líneas curvas (bezier) en rutas de vuelo en lugar de líneas rectas (T8)
- Backend: incluir `fecha_inicio_real` en `MetricasSesionResponse` (B1)

**Non-Goals:**
- Filtros y ordenamiento de vuelos/nodos (T9-T12)
- Panel de envíos por click (T13)
- Panel de entregados recientes (T14)
- Filtro de vuelos en mapa (T15)

## Decisions

### D1: Sidebar colapsable vía estado React + Tailwind
- Usar `useState<boolean>` con `isCollapsed` en `SimulacionContent`
- Botón toggle con ícono `Menu`/`ChevronLeft` de Lucide
- Estado expandido: `w-80` con contenido completo. Estado colapsado: `w-12` con solo indicadores mínimos (estado sesión, telemetría)
- Animación via `transition-all duration-300` de Tailwind
- Alternativa considerada: librería externa de sidebar → se descarta por peso adicional innecesario

### D2: Colores de ocupación ya están en backend
- El backend ya envía `color` y `ocupacion_pct` vía telemetría para nodos y vuelos
- `colorNodoPorOcupacion()` en `lib/colors.ts` ya tiene la lógica verde/ámbar/rojo
- Solo se requiere verificar que `GeoMapaNodo.tsx` usa `nodo.color` correctamente (ya lo hace, T2 es verificación)
- Para T3: agregar `<Popup>` de Leaflet al `Marker`/`AvionAnimado` en `GeoMapaVuelo.tsx` con formato de capacidad

### D3: Fechas reales: B1 backend + frontend calcula
- **Backend B1**: Agregar `OffsetDateTime fecha_inicio_real` a `MetricasSesionResponse`. En `SesionService.obtenerMetricas()` leer desde Redis cache (nuevo campo en JSON) o desde entidad `sesion.getFechaInicioReal()`. En `TickService.buildMetricasJson()` incluir el campo.
- **Frontend T4**: Mostrar `fecha_inicio_real` del response en formato `DD/MM/AAAA HH:mm:ss`
- **Frontend T5**: Calcular fecha actual como `new Date(fechaInicioReal).getTime() + segundosRealesTranscurridos * 1000`. Congelar cuando `estado === 'FINALIZADA'`

### D4: Fechas virtuales desde URL + métricas
- **T6**: Leer `fecha_inicio_virtual` y `hora_inicio_virtual` de `searchParams` (ya se leen en el código actual)
- **T7**: Usar `metricas.dia_hora_virtual` (ya existe). Congelar último valor conocido cuando `estado === 'FINALIZADA'` para evitar que el polling vacío lo borre

### D5: Curvas bezier sin dependencias externas
- Calcular punto medio del segmento con desplazamiento perpendicular proporcional a la distancia
- Generar 50 puntos interpolados en la curva cuadrática bezier
- Usar `Polyline` de Leaflet con los puntos generados
- Alternativa considerada: `leaflet-arc`, `leaflet-curve` (librerías externas) → se descartan por riesgo de compatibilidad con React-Leaflet y mantenimiento futuro

## Risks / Trade-offs

- **R1: Curvas bezier con muchos vuelos** → El cálculo de 50 puntos por vuelo con ~30 vuelos es despreciable (1500 puntos). Si hubiera cientos de vuelos, considerar `leaflet-arc`. Mitigación: mantener implementación manual, es O(n) lineal.
- **R2: Polling vs WebSocket para métricas** → El sistema usa ambos. Las métricas viajan por WebSocket en `telemetria.metricas_sesion` pero actualmente `fecha_inicio_real` solo está disponible en REST. Mitigación: B1 lo agrega a REST, y T4 usa REST al inicio; T5 usa datos locales.
- **R3: Estado FINALIZADA y polling** → Cuando la sesión termina, el polling sigue devolviendo datos. Si el backend retorna 404 después de finalizar, el frontend debe preservar el último estado conocido.
