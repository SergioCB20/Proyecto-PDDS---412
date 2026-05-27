## Why

Completar las tareas asignadas a Dev 1 en el Sprint 2 del sistema TAS FB2B: entidades faltantes de BC2, motor de enrutamiento con tests, servicio de replanificación asíncrona, refactor de servicios BC1 a async, y reporte de sesión con métricas reales.

## What Changes

- **Dominios BC2**: Entidades JPA faltantes (ItemLote, ReporteSesion, PuntoSLA, EstadoReplanificacion) con sus repositorios
- **B4**: Tests unitarios del MotorEnrutamiento (vuelo directo, conexión 2 escalas, sin ruta, capacidad agotada, SLA violado)
- **B6**: ReplanificacionService que escucha VueloCanceladoEvent, crea lotes/items y encola en cola_planificacion
- **B11**: Refactor de EquipajeService y CancelacionService a flujo asíncrono (encolan en cola_planificacion en vez de procesar sync)
- **B8**: ReporteService que genera ReporteSesion al finalizar sesión + MetricasController con GET /sesiones/{id}/reporte
- **Eventos compartidos**: ReplanificacionIniciada, SesionFinalizada

## Capabilities

### New Capabilities
- `dev1-dominios-bc2`: Entidades ItemLote, ReporteSesion, PuntoSLA, EstadoReplanificacion + repositorios JPA
- `dev1-replanificacion-eventos`: ReplanificacionService con EventListener + método directo para simulación
- `dev1-servicios-async`: EquipajeService y CancelacionService con encolamiento asíncrono
- `dev1-reporte-sesion`: ReporteService + MetricasController + DTOs

### Modified Capabilities
- `tick-simulacion`: TickService ahora delega cancelaciones a ReplanificacionService en vez de crear lotes inline
- `sesiones-ejecucion`: SesionService publica SesionFinalizadaEvent al detener sesión

## Impact

- 13 archivos nuevos en bc2/domain/, bc2/infrastructure/, bc2/application/, shared/events/
- 6 archivos modificados: EquipajeService, CancelacionService, EquipajeController, SesionService, TickService, TickServiceTest
- API: POST /api/equipajes ahora retorna 202 Accepted en vez de 201
- API: GET /api/sesiones/{id}/reporte nuevo endpoint
- Sin cambios en BD (tablas ya creadas en migraciones V15-V17)
