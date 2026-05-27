## Context

Dev 1 completa las tareas de BC2 Core en el Sprint 2 del sistema TAS FB2B. Las entidades JPA faltantes (ItemLote, ReporteSesion, PuntoSLA) tienen sus tablas ya creadas por migraciones Flyway V15-V17 pero no tenían clases Java. El ReplanificacionService y ReporteService no existían. EquipajeService y CancelacionService procesaban sincrónicamente.

Decisiones de arquitectura siguen las establecidas en `sprint2-bc2-completar/design.md`: BC2 se comunica con BC1 solo vía eventos Spring, MotorEnrutamiento es stateless, métricas en Redis como JSON.

## Goals / Non-Goals

**Goals:**
- Entidades JPA para tablas V15-V17 (ItemLote, ReporteSesion, PuntoSLA)
- ReplanificacionService con @EventListener + método replanificarEnSesion
- Refactor EquipajeService a async (encola en cola_planificacion, responde 202)
- ReporteService con generación automática al recibir SesionFinalizadaEvent
- MetricasController con GET /reporte
- Tests unitarios del MotorEnrutamiento

**Non-Goals:**
- No se crean migraciones Flyway (tablas ya existen)
- No se cambia la DB (solo se agregan entidades JPA)
- No se implementa PuntoSLA cada hora virtual (postergado por FK constraint)
- No se toca frontend (Dev 3)

## Decisions

### D1: ReplanificacionService con dos modos de entrada
**Decisión:** El servicio expone un método público `replanificarEnSesion(UUID sesionId, ...)` para uso desde TickService y un `@EventListener(VueloCanceladoEvent)` para cancelaciones manuales desde BC1.
**Razón:** El evento VueloCanceladoEvent no porta sesionId; las cancelaciones probabilísticas del TickService necesitan contexto de sesión. Dos caminos evitan modificar el evento compartido.
**Alternativa:** Agregar sesionId opcional a VueloCanceladoEvent — rechazado porque acoplaría shared/events a BC2.

### D2: TickService delega cancelaciones a ReplanificacionService
**Decisión:** TickService ya no crea EventoCancelacion/LoteReplanificacion inline. Delega en ReplanificacionService.replanificarEnSesion().
**Razón:** Elimina duplicación de lógica y centraliza la creación de lotes/items/cola en un solo servicio.

### D3: SesionService publica SesionFinalizadaEvent
**Decisión:** Al detener sesión (manual o por colapso), se publica SesionFinalizadaEvent. ReporteService lo escucha y genera el reporte automáticamente.
**Razón:** ReporteService se activa por evento, sin acoplamiento directo a SesionService.

### D4: EquipajeService async sin cambiar CargaMasivaService
**Decisión:** Solo EquipajeService.registrar() se vuelve async. CargaMasivaService mantiene su flujo sincrónico propio.
**Razón:** CargaMasivaService es un bulk operation que ya fue completado en Sprint 1 y tiene sus propios tests. Refactorizarlo incrementa el riesgo sin beneficio claro.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| CargaMasivaService sigue procesando sync — puede crear inconsistencias si se usa en sesión simulada | CargaMasivaService es para operación real (BC1), no se usa en simulación (BC2) |
| VueloCanceladoEvent sin sesionId — la ruta @EventListener no actualiza métricas de sesión | Es correcto: cancelaciones manuales no ocurren dentro de una simulación |
| PuntoSLA no se registra cada hora virtual | La serie SLA se calcula al finalizar; métricas de Redis mantienen el snapshot actual |
