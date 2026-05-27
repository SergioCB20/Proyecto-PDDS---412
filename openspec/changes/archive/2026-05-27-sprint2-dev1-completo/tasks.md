## 1. Dominios BC2 faltantes

- [x] 1.1 Crear `EstadoReplanificacion.java` enum en bc2/domain/
- [x] 1.2 Crear `ItemLote.java` entidad JPA en bc2/domain/
- [x] 1.3 Crear `ReporteSesion.java` entidad JPA en bc2/domain/
- [x] 1.4 Crear `PuntoSLA.java` entidad JPA en bc2/domain/
- [x] 1.5 Crear `ItemLoteRepository.java` en bc2/infrastructure/
- [x] 1.6 Crear `ReporteSesionRepository.java` en bc2/infrastructure/
- [x] 1.7 Crear `PuntoSLARepository.java` en bc2/infrastructure/

## 2. Eventos compartidos

- [x] 2.1 Crear `ReplanificacionIniciada.java` record en shared/events/
- [x] 2.2 Crear `SesionFinalizada.java` record en shared/events/

## 3. B6 — ReplanificacionService

- [x] 3.1 Crear `ReplanificacionService.java` en bc2/application/
- [x] 3.2 Implementar @EventListener(VueloCanceladoEvent) para cancelaciones manuales BC1
- [x] 3.3 Implementar método replanificarEnSesion() para cancelaciones en simulación
- [x] 3.4 Identificar equipajes afectados vía findByVueloActualId
- [x] 3.5 Marcar equipajes como EN_REPLANIFICACION
- [x] 3.6 Crear EventoCancelacion + LoteReplanificacion en BD
- [x] 3.7 Crear ItemLote por cada equipaje afectado
- [x] 3.8 Encolar cada equipaje en cola_planificacion con tipo REPLANIFICACION
- [x] 3.9 Publicar evento ReplanificacionIniciada
- [x] 3.10 Incrementar maletas_replanificadas en métricas de sesión

## 4. B11 — Servicios BC1 asíncronos

- [x] 4.1 Refactor EquipajeService.registrar(): validar, guardar REGISTRADO, encolar, responder 202
- [x] 4.2 Crear EquipajeRegistradoResponse DTO sin plan_viaje
- [x] 4.3 Refactor EquipajeController: retornar 202 Accepted
- [x] 4.4 Refactor CancelacionService.cancelar(): marcar CANCELADO, publicar VueloCanceladoEvent

## 5. B8 — ReporteService y MetricasController

- [x] 5.1 Crear `ReporteService.java` en bc2/application/
- [x] 5.2 Implementar @EventListener(SesionFinalizada) para generación automática
- [x] 5.3 Implementar cálculo de sla_incumplido_pct
- [x] 5.4 Implementar construcción de serie_sla desde PuntoSLARepository
- [x] 5.5 Implementar detección de colapso en reporte
- [x] 5.6 Crear DTOs: ReporteSesionResponse, PuntoSLAResponse
- [x] 5.7 Crear `MetricasController.java` en bc2/infrastructure/
- [x] 5.8 Implementar GET /sesiones/{id}/metricas (lee Redis)
- [x] 5.9 Implementar GET /sesiones/{id}/reporte
- [x] 5.10 Publicar SesionFinalizadaEvent en SesionService.detenerSesion()
- [x] 5.11 Publicar SesionFinalizadaEvent en TickService al detectar colapso

## 6. B4 — Tests unitarios MotorEnrutamiento

- [x] 6.1 Test: vuelo directo retorna 1 segmento
- [x] 6.2 Test: prioriza vuelo más temprano entre dos directos
- [x] 6.3 Test: conexión de 2 escalas retorna 2 segmentos
- [x] 6.4 Test: respeta mínimo 60 min de conexión
- [x] 6.5 Test: sin ruta posible retorna error
- [x] 6.6 Test: capacidad agotada retorna error
- [x] 6.7 Test: destino no encontrado retorna error
- [x] 6.8 Test: SLA violado no incluye vuelo tardío

## 7. Refactor TickService

- [x] 7.1 Delegar evaluarCancelaciones() a ReplanificacionService.replanificarEnSesion()
- [x] 7.2 Remover EventoCancelacionRepository y LoteReplanificacionRepository de TickService
- [x] 7.3 Inyectar ReplanificacionService + ApplicationEventPublisher en TickService
- [x] 7.4 Publicar SesionFinalizadaEvent en detectarColapso()
- [x] 7.5 Actualizar TickServiceTest (nueva firma, mock ReplanificacionService)
