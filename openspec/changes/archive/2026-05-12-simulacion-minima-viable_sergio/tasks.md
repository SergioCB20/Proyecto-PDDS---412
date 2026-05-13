# Tasks: Simulación con Datos Reales

## Backend - Migraciones BC2
- [x] Crear V12__sesiones_ejecucion.sql
- [x] Crear V13__eventos_cancelacion.sql
- [x] Crear V14__lotes_replanificacion.sql
- [x] Crear V15__items_lote.sql
- [x] Crear V16__reportes_sesion.sql
- [x] Crear V17__puntos_sla.sql

## Backend - Entidades BC2
- [x] Crear enum TipoSesion
- [x] Crear enum EstadoSesion
- [x] Crear enum EstadoLote
- [x] Crear SesionEjecucion.java
- [x] Crear EventoCancelacion.java
- [x] Crear LoteReplanificacion.java

## Backend - Repos BC2
- [x] Crear SesionRepository
- [x] Crear EventoCancelacionRepository
- [x] Crear LoteReplanificacionRepository

## Backend - SesionService + Controller
- [x] Crear SesionService con métodos CRUD
- [x] Crear SesionController con endpoints
- [x] Implementar /metricas con respuesta dummy

## Frontend - Conectar simulación
- [x] Modificar /simulacion/[id] para crear sesión vía POST /sesiones
- [x] Implementar polling GET /sesiones/{id}/metricas
- [x] Conectar botones iniciar/pausar/detener a endpoints

## Resumen
- Total tareas: 19
- Completadas: 19
- Pendientes: 0