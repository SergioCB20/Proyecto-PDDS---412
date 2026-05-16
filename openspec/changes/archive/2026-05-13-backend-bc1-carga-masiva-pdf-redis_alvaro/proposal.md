## Why

Las tareas A2, A3, A4 y A5 del backlog de Persona 1 (BC1 - Gestión Operativa) requieren implementación para completar el ~85% del módulo:
- **A2**: Carga masiva deequipajes desde CSV
- **A3**: Confirmar carga masiva e ingresar registros válidos
- **A4**: Generar manifiesto PDF por vuelo
- **A5**: Integración con Redis para métricas en tiempo real

Estas funcionalidades son críticas para la operación del sistema y desbloquean al equipo de frontend (tareas C4 y C7).

## What Changes

### Backend - Carga Masiva CSV (A2)
- Endpoint `POST /api/equipajes/carga-masiva` (multipart/form-data)
- Parseo de CSV con soporte para comillas
- Validación por cada fila: destino IATA existe, vuelo existe y PROGRAMADO, capacidad disponible
- Preview de respuesta: `{ total, validos, con_revision, registros[] }`

### Backend - Confirmar Carga Masiva (A3)
- Endpoint `POST /api/equipajes/carga-masiva/confirmar`
- Request: `{ ids_equipaje: string[] }`
- Batch insert de registros válidos
- Respuesta: `{ ingresados, fallidos }`

### Backend - Manifiesto PDF (A4)
- Endpoint `GET /api/manifiestos/{vuelo_id}`
- Generación de PDF con tabla de equipajes del vuelo
- Encabezado con datos del vuelo, tabla con ID externo, destino, estado, SLA
- Descarga como archivo PDF

### Backend - Integración Redis (A5)
- Service `RedisCacheService` en `shared/infrastructure/`
- Escritura de `nodo:{id}:ocupacion` y `vuelo:{id}:carga_disponible`
- Integración en `EquipajeService.registrar()` y `CancelacionService.cancelar()`

## Capabilities

### New Capabilities
- `carga-masiva-csv`: Carga y validación de CSV con preview de resultados
- `confirmar-carga-masiva`: Batch insert de equipajes validados
- `manifiesto-pdf`: Generación de PDF por vuelo
- `redis-cache`: Cache de ocupación de nodos y carga de vuelos

### Modified Capabilities
- `bc1-gestion-operativa.md`: Agregar endpoints de carga masiva y manifiesto
- `TAREAS_EQUIPO.md`: Marcar A2, A3, A4, A5 como completadas

## Impact

### Archivos creados
- `backend/.../bc1/application/CargaMasivaService.java`
- `backend/.../bc1/application/ManifiestoService.java`
- `backend/.../bc1/infrastructure/ManifiestoController.java`
- `backend/.../shared/infrastructure/RedisCacheService.java`

### Archivos modificados
- `backend/.../bc1/infrastructure/EquipajeController.java` (endpoints nuevos)
- `backend/.../bc1/infrastructure/EquipajeRepository.java` (nuevo método)
- `backend/.../bc1/application/EquipajeService.java` (Redis)
- `backend/.../bc1/application/CancelacionService.java` (Redis)
- `backend/.../shared/GlobalExceptionHandler.java` (nuevos handlers)
- `backend/pom.xml` (OpenPDF)
- `backend/.../application.properties` (Redis config)

### Dependencias
- APIs existentes: `/api/equipajes`, `/api/vuelos`, `/api/nodos`
- Nueva dependencia: OpenPDF 2.0.3
- Redis: ya estaba en dependencias, se agregó configuración