## MODIFIED Requirements

### Requirement: SesionService publica SesionFinalizadaEvent al detener
El sistema SHALL publicar un evento SesionFinalizada al detener una sesión, para que ReporteService genere el reporte automáticamente.

#### Scenario: Evento publicado al detener sesión
- **WHEN** se llama a SesionService.detenerSesion(id)
- **THEN** se persiste la sesión como FINALIZADA, se actualiza Redis, y se publica SesionFinalizadaEvent con sesionId, estadoFinal=FINALIZADA, y timestamp
