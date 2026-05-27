## MODIFIED Requirements

### Requirement: TickService delega cancelaciones en ReplanificacionService
El sistema SHALL delegar el procesamiento de cancelaciones probabilísticas al ReplanificacionService en lugar de crear EventoCancelacion y LoteReplanificacion inline.

#### Scenario: Cancelación probabilística delegada
- **WHEN** el TickService detecta una cancelación probabilística
- **THEN** llama a ReplanificacionService.replanificarEnSesion() con sesionId, vueloId, causa, y momentoVirtual
- **AND** no crea EventoCancelacion ni LoteReplanificacion directamente

#### Scenario: Colapso publica SesionFinalizadaEvent
- **WHEN** TickService detecta colapso (ocupacion > almacen_rojo_max)
- **THEN** marca sesión COLAPSADA, escribe Redis, publica SesionFinalizadaEvent
- **AND** ReporteService genera el reporte al recibir el evento
