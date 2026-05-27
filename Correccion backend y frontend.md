# Reporte de Corrección — Backend y Frontend

## 1. CRUD Equipaje — Modificar y Eliminar

**Problema:** No existen endpoints `PUT /api/equipajes/{id}` ni `DELETE /api/equipajes/{id}`.

### Backend

**1.1** En `EquipajeService.java`, agregar:

```java
@Transactional
public EquipajeResponse actualizar(UUID id, RegistrarEquipajeRequest request) {
    Equipaje equipaje = equipajeRepository.findById(id)
        .orElseThrow(() -> new EquipajeNoEncontradoException("Equipaje no encontrado: " + id));

    NodoLogistico nodoDestino = nodoRepository.findByCodigoIata(request.destino_iata())
        .orElseThrow(() -> new ValidacionException("Destino IATA no existe"));

    Vuelo vuelo = vueloRepository.findById(request.vuelo_id())
        .orElseThrow(() -> new ValidacionException("Vuelo no encontrado"));

    equipaje.setDestinoIata(request.destino_iata());
    equipaje.setSlaComprometido(request.sla_comprometido());
    equipaje.setVueloActual(vuelo);
    equipajeRepository.save(equipaje);

    PlanViaje planViaje = planViajeRepository.findByEquipajeId(id)
        .orElseThrow(() -> new ValidacionException("Plan de viaje no encontrado"));

    List<SegmentoPlan> segmentos = segmentoPlanRepository.findByPlanViajeIdOrderByOrdenAsc(planViaje.getId());
    return toEquipajeResponse(equipaje, planViaje, segmentos);
}

@Transactional
public void eliminar(UUID id) {
    Equipaje equipaje = equipajeRepository.findById(id)
        .orElseThrow(() -> new EquipajeNoEncontradoException("Equipaje no encontrado: " + id));

    PlanViaje planViaje = planViajeRepository.findByEquipajeId(id)
        .orElseThrow(() -> new ValidacionException("Plan de viaje no encontrado"));

    List<SegmentoPlan> segmentos = segmentoPlanRepository.findByPlanViajeIdOrderByOrdenAsc(planViaje.getId());
    segmentoPlanRepository.deleteAll(segmentos);
    planViajeRepository.delete(planViaje);

    Vuelo vuelo = equipaje.getVueloActual();
    if (vuelo != null) {
        vuelo.setCargaDisponible(vuelo.getCargaDisponible() + 1);
        vueloRepository.save(vuelo);
    }

    equipajeRepository.delete(equipaje);
}
```

**1.2** En `EquipajeController.java`, agregar:

```java
@PutMapping("/{id}")
public ResponseEntity<?> actualizar(@PathVariable UUID id, @RequestBody RegistrarEquipajeRequest request) {
    try {
        return ResponseEntity.ok(equipajeService.actualizar(id, request));
    } catch (EquipajeService.EquipajeNoEncontradoException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(404, "NO_ENCONTRADO", e.getMessage()));
    } catch (EquipajeService.ValidacionException e) {
        return ResponseEntity.unprocessableEntity().body(error(422, "VALIDACION_FALLIDA", e.getMessage()));
    }
}

@DeleteMapping("/{id}")
public ResponseEntity<?> eliminar(@PathVariable UUID id) {
    try {
        equipajeService.eliminar(id);
        return ResponseEntity.noContent().build();
    } catch (EquipajeService.EquipajeNoEncontradoException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(404, "NO_ENCONTRADO", e.getMessage()));
    }
}
```

### Frontend

**1.3** En `frontend/app/operacion/page.tsx`, agregar en la lista de equipajes recientes (línea 417):

- Botón "✏️" (editar) → abre el formulario individual precargado con los datos del equipaje
- Botón "🗑️" (eliminar) → confirmación y llamada `api.delete(\`/equipajes/${id}\`)`

Después de eliminar, actualizar el estado local:
```typescript
setEquipajesRecientes(prev => prev.filter(eq => eq.id_externo !== idExterno));
```

---

## 2. CRUD Vuelo — Crear, Modificar y Eliminar

**Problema:** No existen endpoints `POST /api/vuelos`, `PUT /api/vuelos/{id}`, `DELETE /api/vuelos/{id}`.

### Backend

**2.1** En `VueloService.java`, agregar un nuevo `ValidacionException` y los métodos:

```java
public static class ValidacionException extends RuntimeException {
    public ValidacionException(String msg) { super(msg); }
}

public record CrearVueloRequest(
    String codigo_vuelo,
    UUID origen_id,
    UUID destino_id,
    OffsetDateTime hora_salida,
    OffsetDateTime hora_llegada,
    Integer capacidad_carga
) {}

@Transactional
public VueloResponse crear(CrearVueloRequest request) {
    NodoLogistico origen = nodoRepository.findById(request.origen_id())
        .orElseThrow(() -> new ValidacionException("Origen no encontrado"));
    NodoLogistico destino = nodoRepository.findById(request.destino_id())
        .orElseThrow(() -> new ValidacionException("Destino no encontrado"));

    Vuelo vuelo = new Vuelo();
    vuelo.setId(UUID.randomUUID());
    vuelo.setCodigoVuelo(request.codigo_vuelo());
    vuelo.setOrigen(origen);
    vuelo.setDestino(destino);
    vuelo.setHoraSalida(request.hora_salida());
    vuelo.setHoraLlegada(request.hora_llegada());
    vuelo.setCapacidadCarga(request.capacidad_carga());
    vuelo.setCargaDisponible(request.capacidad_carga());
    vuelo.setEstado(EstadoVuelo.PROGRAMADO);
    vueloRepository.save(vuelo);

    return toResponse(vuelo);
}

@Transactional
public VueloResponse actualizar(UUID id, CrearVueloRequest request) {
    Vuelo vuelo = vueloRepository.findById(id)
        .orElseThrow(() -> new VueloNoEncontradoException("Vuelo no encontrado: " + id));

    if (vuelo.getEstado() != EstadoVuelo.PROGRAMADO) {
        throw new ValidacionException("Solo se puede modificar un vuelo PROGRAMADO");
    }

    NodoLogistico origen = nodoRepository.findById(request.origen_id())
        .orElseThrow(() -> new ValidacionException("Origen no encontrado"));
    NodoLogistico destino = nodoRepository.findById(request.destino_id())
        .orElseThrow(() -> new ValidacionException("Destino no encontrado"));

    vuelo.setCodigoVuelo(request.codigo_vuelo());
    vuelo.setOrigen(origen);
    vuelo.setDestino(destino);
    vuelo.setHoraSalida(request.hora_salida());
    vuelo.setHoraLlegada(request.hora_llegada());
    vuelo.setCapacidadCarga(request.capacidad_carga());
    vuelo.setCargaDisponible(request.capacidad_carga());
    vueloRepository.save(vuelo);

    return toResponse(vuelo);
}

@Transactional
public void eliminar(UUID id) {
    Vuelo vuelo = vueloRepository.findById(id)
        .orElseThrow(() -> new VueloNoEncontradoException("Vuelo no encontrado: " + id));

    if (vuelo.getEstado() != EstadoVuelo.PROGRAMADO) {
        throw new ValidacionException("Solo se puede eliminar un vuelo PROGRAMADO");
    }

    long equipajesAsignados = equipajeRepository.countByVueloActualId(id);
    if (equipajesAsignados > 0) {
        throw new ValidacionException("No se puede eliminar un vuelo con equipajes asignados");
    }

    vueloRepository.delete(vuelo);
}
```

**2.2** En `VueloController.java`, agregar:

```java
@PostMapping
public ResponseEntity<?> crear(@RequestBody VueloService.CrearVueloRequest request) {
    try {
        return ResponseEntity.status(HttpStatus.CREATED).body(vueloService.crear(request));
    } catch (VueloService.ValidacionException e) {
        return ResponseEntity.unprocessableEntity()
                .body(Map.of("status", 422, "error", "VALIDACION", "mensaje", e.getMessage()));
    }
}

@PutMapping("/{id}")
public ResponseEntity<?> actualizar(@PathVariable UUID id, @RequestBody VueloService.CrearVueloRequest request) {
    try {
        return ResponseEntity.ok(vueloService.actualizar(id, request));
    } catch (VueloService.VueloNoEncontradoException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("status", 404, "error", "NO_ENCONTRADO", "mensaje", e.getMessage()));
    } catch (VueloService.ValidacionException e) {
        return ResponseEntity.unprocessableEntity()
                .body(Map.of("status", 422, "error", "VALIDACION", "mensaje", e.getMessage()));
    }
}

@DeleteMapping("/{id}")
public ResponseEntity<?> eliminar(@PathVariable UUID id) {
    try {
        vueloService.eliminar(id);
        return ResponseEntity.noContent().build();
    } catch (VueloService.VueloNoEncontradoException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("status", 404, "error", "NO_ENCONTRADO", "mensaje", e.getMessage()));
    } catch (VueloService.ValidacionException e) {
        return ResponseEntity.unprocessableEntity()
                .body(Map.of("status", 422, "error", "VALIDACION", "mensaje", e.getMessage()));
    }
}
```

**2.3** En `SecurityConfig.java`, agregar reglas:

```java
.requestMatchers(HttpMethod.POST, "/api/vuelos/**").hasRole("OPERADOR_LOGISTICO")
.requestMatchers(HttpMethod.PUT, "/api/vuelos/**").hasRole("OPERADOR_LOGISTICO")
.requestMatchers(HttpMethod.DELETE, "/api/vuelos/**").hasRole("OPERADOR_LOGISTICO")
```

**2.4** Agregar `countByVueloActualId` en `EquipajeRepository.java`:

```java
long countByVueloActualId(UUID vueloId);
```

**2.5** Agregar inyección de `NodoLogisticoRepository` y `EquipajeRepository` en `VueloService.java`:

```java
private final NodoLogisticoRepository nodoRepository;
private final EquipajeRepository equipajeRepository;

public VueloService(VueloRepository vueloRepository, NodoLogisticoRepository nodoRepository, EquipajeRepository equipajeRepository) {
    this.vueloRepository = vueloRepository;
    this.nodoRepository = nodoRepository;
    this.equipajeRepository = equipajeRepository;
}
```

### Frontend

**2.6** En `frontend/app/operacion/page.tsx`, agregar:

- Al lado del botón "Individual" (línea 299), un botón "Nuevo Vuelo" que abre un formulario con campos: código, origen (select de nodos), destino (select de nodos), hora salida, hora llegada, capacidad de carga
- Botones editar/eliminar en cada vuelo de la lista (línea 453), solo para vuelos `PROGRAMADO`
- `api.put(\`/vuelos/${id}\`, data)` y `api.delete(\`/vuelos/${id}\`)`

---

## 3. Carga Masiva CSV

**Problemas:** El frontend nunca envía el archivo al backend, el payload de confirmar no coincide, y el formato SLA es incompatible.

### 3.1 — Preview nunca se envía al backend

**Frontend** — En `operacion/page.tsx:handleFileChange`, reemplazar el `FileReader` por `FormData`:

```typescript
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setCsvError(null);
    setCsvLoading(true);

    try {
        const formData = new FormData();
        formData.append('archivo', file);
        const preview = await api.post<CargaMasivaPreview>('/equipajes/carga-masiva', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        setCsvPreview(preview);
    } catch (err: unknown) {
        const error = err as { mensaje?: string; message?: string };
        setCsvError(error.mensaje || error.message || 'Error al procesar archivo');
    } finally {
        setCsvLoading(false);
    }
};
```

**Frontend** — Actualizar la interfaz `CargaMasivaPreview` en `types.ts` para que coincida con la respuesta del backend (`PreviewResponse`):

```typescript
export interface CargaMasivaPreview {
    total: number;
    validos: number;
    con_revision: number;
    registros: CargaMasivaRegistro[];
}

export interface CargaMasivaRegistro {
    fila: number;
    id_equipaje: string;
    destino_iata: string;
    vuelo_id: string;
    sla_comprometido: string;
    estado_validacion: 'VALIDO' | 'REVISION';
    motivo: string | null;
}
```

**Frontend** — Ajustar la tabla del modal (líneas 562-627) para iterar sobre `csvPreview.registros` y agrupar por `estado_validacion`.

### 3.2 — Payload incorrecto en confirmar

**Frontend** — En `handleConfirmarCargaMasiva` (línea 208), cambiar:

```typescript
// CORREGIDO
const ids_equipaje = csvPreview.validos.map(r => r.id_equipaje);
const response = await api.post<ConfirmarResponse>('/equipajes/carga-masiva/confirmar', { ids_equipaje });
```

Agregar `ConfirmarResponse` a `types.ts`:
```typescript
export interface ConfirmarResponse {
    ingresados: number;
    fallidos: number;
}
```

### 3.3 — SLA en formato incorrecto

**Frontend** — En `parseCSV()` (línea 140), convertir SLA de horas a ISO 8601:

```typescript
// En lugar de guardar el número directo
const slaHoras = parseInt(cols[slaIdx]);
const slaDate = new Date();
slaDate.setHours(slaDate.getHours() + slaHoras);
// Guardar ISO string en validos
sla_comprometido: slaDate.toISOString(),
```

### 3.4 — Errores silenciados en backend

**Backend** — En `CargaMasivaService.confirmar()` (línea 265), agregar logger:

```java
private static final Logger log = LoggerFactory.getLogger(CargaMasivaService.class);

// En el catch:
catch (Exception e) {
    log.error("Error al confirmar equipaje {}: {}", preview.idEquipaje(), e.getMessage(), e);
    fallidos++;
}
```

---

## 4. Problemas menores adicionales

### 4.1 — Snake_case / camelCase en VueloResponse

**Problema:** Backend serializa `codigoVuelo`, `horaSalida` (camelCase), frontend espera `codigo_vuelo`, `hora_salida` (snake_case).

**Solución recomendada (backend):** Anotar campos con `@JsonProperty` en `VueloService.VueloResponse`:

```java
public record VueloResponse(
    UUID id,
    @JsonProperty("codigo_vuelo") String codigoVuelo,
    String estado,
    OrigenDestinoResponse origen,
    OrigenDestinoResponse destino,
    @JsonProperty("hora_salida") OffsetDateTime horaSalida,
    @JsonProperty("hora_llegada") OffsetDateTime horaLlegada,
    @JsonProperty("capacidad_carga") Integer capacidadCarga,
    @JsonProperty("carga_disponible") Integer cargaDisponible
) {}
```

### 4.2 — Lat/Lng faltantes en VueloResponse

**Backend** — Agregar a `VueloResponse` y mapear en `toResponse()`:

```java
@JsonProperty("origen_lat") Double origenLat,
@JsonProperty("origen_lon") Double origenLon,
@JsonProperty("destino_lat") Double destinoLat,
@JsonProperty("destino_lon") Double destinoLon
```

```java
// En toResponse():
vuelo.getOrigen().getLatitud(),
vuelo.getOrigen().getLongitud(),
vuelo.getDestino().getLatitud(),
vuelo.getDestino().getLongitud()
```

### 4.3 — Filtro `destino_iata` ignorado

**Backend** — En `VueloService.listar()` (línea 44), agregar:

```java
if (destinoIata != null && !destinoIata.isBlank()) {
    spec = spec.and((root, query, cb) ->
        cb.equal(root.get("destino").get("codigoIata"), destinoIata));
}
```

### 4.4 — HTTP status inconsistente (400 vs 422)

**Backend** — En `GlobalExceptionHandler.java`, cambiar `ValidacionException` a 422:

```java
@ExceptionHandler(EquipajeService.ValidacionException.class)
public ResponseEntity<?> handleValidacion(EquipajeService.ValidacionException e) {
    return ResponseEntity.unprocessableEntity()
            .body(Map.of("status", 422, "error", "VALIDACION_FALLIDA", "mensaje", e.getMessage()));
}
```

---

## Orden de implementación

| Orden | Tarea | Archivos a modificar | Esfuerzo |
|-------|-------|---------------------|----------|
| 1 | CRUD Equipaje (PUT/DELETE) | `EquipajeService.java`, `EquipajeController.java`, `page.tsx` | 2h |
| 2 | CRUD Vuelo (POST/PUT/DELETE) | `VueloService.java`, `VueloController.java`, `SecurityConfig.java`, `EquipajeRepository.java`, `page.tsx` | 3h |
| 3 | Carga masiva — enviar archivo al backend | `page.tsx`, `types.ts` | 1h |
| 4 | Carga masiva — payload confirmar correcto | `page.tsx`, `types.ts` | 30min |
| 5 | Carga masiva — SLA ISO 8601 | `page.tsx` | 30min |
| 6 | Snake_case / camelCase | `VueloService.java` | 30min |
| 7 | Lat/Lng en VueloResponse | `VueloService.java` | 15min |
| 8 | Filtro destino_iata + logs + HTTP status | `VueloService.java`, `CargaMasivaService.java`, `GlobalExceptionHandler.java` | 30min |
