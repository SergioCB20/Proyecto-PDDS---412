## 1. Tarea 5 - Integración Redis

- [x] 1.1 Crear `RedisCacheService.java` en `shared/infrastructure/`
- [x] 1.2 Agregar métodos: actualizarOcupacionNodo, actualizarCargaDisponibleVuelo, getOcupacionNodo, getCargaDisponibleVuelo
- [x] 1.3 Configurar Redis en `application.properties`
- [x] 1.4 Integrar en `EquipajeService.registrar()`
- [x] 1.5 Integrar en `CancelacionService.cancelar()`

## 2. Tarea 2 - Carga Masiva CSV

- [x] 2.1 Crear `CargaMasivaService.java` en `bc1/application/`
- [x] 2.2 Implementar parser CSV con soporte de comillas
- [x] 2.3 Validar cada fila: destino IATA existe, vuelo existe y PROGRAMADO, capacidad
- [x] 2.4 Guardar preview en ConcurrentHashMap
- [x] 2.5 Crear endpoint `POST /equipajes/carga-masiva` en EquipajeController
- [x] 2.6 Agregar handler de excepción en GlobalExceptionHandler

## 3. Tarea 3 - Confirmar Carga Masiva

- [x] 3.1 Implementar método `confirmar()` en CargaMasivaService
- [x] 3.2 Batch insert: crear Equipaje, PlanViaje, SegmentoPlan por cada registro
- [x] 3.3 Publicar EquipajeIngresadoEvent por cada equipaje
- [x] 3.4 Actualizar ocupación nodo y carga vuelo en BD y Redis
- [x] 3.5 Crear endpoint `POST /equipajes/carga-masiva/confirmar`
- [x] 3.6 Limpiar preview de memoria después de confirmar

## 4. Tarea 4 - Manifiesto PDF

- [x] 4.1 Agregar dependencia OpenPDF en `pom.xml`
- [x] 4.2 Agregar método `findByVueloActualId` en EquipajeRepository
- [x] 4.3 Crear `ManifiestoService.java` en `bc1/application/`
- [x] 4.4 Generar PDF: encabezado + tabla de equipajes
- [x] 4.5 Crear `ManifiestoController.java` en `bc1/infrastructure/`
- [x] 4.6 Configurar headers para descarga de PDF
- [x] 4.7 Agregar handlers de excepción en GlobalExceptionHandler

## 5. Documentación

- [x] 5.1 Crear proposal.md en openspec/changes
- [x] 5.2 Crear design.md en openspec/changes
- [x] 5.3 Crear tasks.md en openspec/changes
- [x] 5.4 Marcar A2, A3, A4, A5 como completadas en TAREAS_EQUIPO.md