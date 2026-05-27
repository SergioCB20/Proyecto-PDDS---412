## Context

El backend actual solo soporta `POST /api/equipajes` (registro individual) y `GET /api/equipajes/{id}/plan-viaje` (consulta). Para vuelos, solo soporta `GET /api/vuelos` (listado paginado) y `GET /api/vuelos/{id}` (obtener uno). No existen operaciones de modificación ni eliminación.

La carga masiva por CSV tiene el flujo incompleto: el frontend parsea el CSV localmente en lugar de enviarlo al backend, el payload de confirmación usa campos incorrectos, y el SLA se envía como número de horas en lugar de ISO 8601.

Además, `VueloResponse` serializa en camelCase mientras el frontend espera snake_case, y faltan las coordenadas lat/lng que el mapa del frontend necesita.

## Goals / Non-Goals

**Goals:**
- Completar CRUD de equipaje (PUT/DELETE) y vuelo (POST/PUT/DELETE) con validaciones de negocio y autorización por rol.
- Corregir el flujo de carga masiva CSV: envío del archivo al backend, payload de confirmación correcto, SLA en ISO 8601.
- Agregar logging de errores en `CargaMasivaService.confirmar()`.
- Normalizar serialización de `VueloResponse` a snake_case y agregar coordenadas lat/lng.
- Implementar filtro `destino_iata` en `VueloService.listar()`.
- Uniformizar código HTTP de `ValidacionException` a 422.

**Non-Goals:**
- No se implementan nuevos módulos ni bounded contexts.
- No se modifica la lógica de enrutamiento ni replanificación (BC2).
- No se agregan tests automatizados (queda para otra iteración).

## Decisions

1. **Validación de estado en vuelo**: Solo se permite modificar/eliminar vuelos con estado `PROGRAMADO`. Esto evita inconsistencia con vuelos ya en ejecución o cancelados. Alternativa considerada: permitir siempre y propagar cambios. Se descartó porque podría derivar en datos inconsistentes con equipajes ya embarcados.

2. **Eliminación en cascada de equipaje**: Al eliminar un equipaje, se eliminan también su `PlanViaje` y `Segmentos` asociados, y se libera la carga del vuelo. Alternativa considerada: borrado lógico (cambiar estado a `ELIMINADO`). Se descartó porque el dominio no define ese estado y complicaría consultas futuras.

3. **Carga masiva vía FormData**: El frontend envía el archivo CSV al backend usando `FormData` con `Content-Type: multipart/form-data`. El backend lo procesa y devuelve un preview. Alternativa considerada: parsear en frontend y enviar JSON. Se descartó porque centraliza la validación en el backend y evita duplicación de lógica de parsing.

4. **Serialización con @JsonProperty**: Se usa `@JsonProperty` directamente en los records de `VueloResponse` para forzar snake_case. Alternativa considerada: configurar `spring.jackson.property-naming-strategy=SNAKE_CASE` globalmente. Se descartó porque afectaría a otras entidades que usan camelCase intencionalmente.

5. **HTTP 422 para validaciones de negocio**: Se cambia el handler de `EquipajeService.ValidacionException` de 400 a 422, alineado con el estándar del spec (reglas de negocio violadas = 422, no 400).

## Risks / Trade-offs

- [Eliminación de equipaje] Si hay referencias externas (BC2, auditoría) al equipaje eliminado, podrían quedar huérfanas. Mitigación: el dominio actual no tiene esas referencias, pero debe documentarse.
- [Carga masiva] El preview se almacena en memoria (`ConcurrentHashMap`). Si el servidor se reinicia entre preview y confirmar, se pierde. Mitigación: el flujo actual ya tiene este comportamiento; se documenta como limitación conocida.
- [Coordenadas lat/lng] Se exponen campos adicionales en `VueloResponse`. No hay riesgo de seguridad ya que los nodos ya exponen latitud/longitud.
