# BC1 — Gestión Operativa

> **Spec owner:** PM/Lead  
> **Estado:** Draft v1  
> **Última actualización:** 10/05/2026
> **Responsables:** Alvaro y Eduardo (Backend)

---

## Propósito

Es el núcleo del dominio. Modela todo lo que ocurre en la operación real: el ingreso de equipaje, su asignación a un `PlanViaje` que documenta su recorrido segmento a segmento, y la red logística sobre la que se mueve (vuelos y nodos). El `PlanVuelos` actúa como el catálogo oficial de todos los vuelos del sistema y es la fuente de verdad que consumen los otros bounded contexts.

---

## Aggregate Roots

| Aggregate Root | Descripción |
|---|---|
| `Equipaje` | Unidad principal del dominio. Tiene identidad propia y ciclo de vida. |
| `PlanViaje` | Documento que registra la ruta asignada y la ubicación actual del equipaje. |
| `Vuelo` | Vuelo registrado en el sistema con su estado y capacidad. |
| `NodoLogistico` | Aeropuerto o hub de la red logística. |
| `PlanVuelos` | Catálogo que agrupa todos los vuelos del sistema (seed inicial). |

---

## Entidades internas (no accesibles directamente)

| Entidad | Aggregate Root dueño | Descripción |
|---|---|---|
| `SegmentoPlan` | `PlanViaje` | Tramo individual de la ruta (un vuelo, de nodo A a nodo B). |

---

## Value Objects

| Value Object | Dónde se usa | Descripción |
|---|---|---|
| `CodigoIATA` | `NodoLogistico`, `Equipaje` | Código de 3 letras del aeropuerto (ej. LIM, MIA). |
| `Coordenada` | `NodoLogistico`, `Vuelo`, `PlanViaje` | Par latitud/longitud. |
| `SLA` | `Equipaje`, `PlanViaje` | Fecha/hora límite de entrega comprometida. |
| `CapacidadCarga` | `Vuelo` | Capacidad total y disponible de carga. |
| `CapacidadAlmacen` | `NodoLogistico` | Capacidad total y ocupación actual del almacén. |

---

## Domain Events publicados

| Evento | Cuándo se publica | Consumidor |
|---|---|---|
| `EquipajeIngresado` | Al confirmar el registro de un equipaje | BC2 — para disparar el cálculo de ruta |
| `VueloCancelado` | Al cancelar un vuelo manualmente | BC2 — para disparar la replanificación |
| `UbicacionActualizada` | Cuando el equipaje avanza al siguiente segmento | Servicio de Telemetría |
| `PlanViajeCreado` | Cuando BC2 devuelve la ruta calculada y se persiste | Auditoría / Telemetría |
| `SLAIncumplido` | Cuando la ruta re-planificada supera el SLA | Reporte de sesión |

---

## Reglas de negocio

### Registro de equipaje
- El campo `destino_iata` debe existir en la tabla `nodos_logisticos`.
- El `vuelo_id` asignado debe tener estado `PROGRAMADO`.
- La ocupación proyectada del almacén (`ocupacion_actual + 1`) no debe superar `capacidad_almacen`. Si supera el 100%, bloquear confirmación.
- El origen se autocompleta con el `nodo_ref_id` del operador autenticado.
- Al confirmar, publicar `EquipajeIngresado` para que BC2 calcule la ruta.

### Cancelación de vuelo
- Solo un vuelo con estado `PROGRAMADO` o `EN_RUTA` puede cancelarse.
- Al cancelar, cambiar estado del vuelo a `CANCELADO` y publicar `VueloCancelado`.
- El sistema no elimina físicamente ningún vuelo.

### Listado de vuelos
- `GET /api/vuelos` acepta el query param `destino_iata` para filtrar vuelos por código IATA del nodo destino.
- La respuesta de `GET /api/vuelos` y `GET /api/vuelos/{id}` incluye los campos `origen_lat`, `origen_lon`, `destino_lat`, `destino_lon` con coordenadas de los nodos origen y destino.

### Plan de viaje
- Cada equipaje tiene exactamente un `PlanViaje`.
- El `PlanViaje` es creado por BC2 tras calcular la ruta; BC1 lo persiste.
- `ubicacion_tipo` puede ser `NODO` o `VUELO`.
- `ubicacion_lat` y `ubicacion_lon` reflejan la posición actual del equipaje para el mapa.

### Eliminación de equipaje
- Al eliminar un equipaje, se incrementa en 1 la `carga_disponible` del vuelo al que estaba asignado.
- Se elimina el plan de viaje y segmentos asociados.

### Estados del equipaje
```
REGISTRADO → ENRUTADO → EN_VUELO → EN_ALMACEN → ENTREGADO
                ↓
         EN_REPLANIFICACION → ENRUTADO | INCUMPLIMIENTO_SLA
```

### Estados del vuelo
```
PROGRAMADO → EN_RUTA → COMPLETADO
     ↓
  CANCELADO
```

---

## Seed inicial (PlanVuelos)

Al arrancar la aplicación, el sistema debe cargar automáticamente:

**1 registro en `plan_vuelos`:**
```sql
INSERT INTO plan_vuelos (id, descripcion, vigencia_desde, vigencia_hasta)
VALUES (gen_random_uuid(), 'Plan operativo inicial', '2025-06-01', '2025-12-31');
```

**5 nodos logísticos mínimos:**

| codigo_iata | nombre | latitud | longitud | capacidad_almacen |
|---|---|---|---|---|
| LIM | Aeropuerto Jorge Chávez | -12.0219 | -77.1143 | 500 |
| MIA | Miami International | 25.7959 | -80.2870 | 800 |
| BOG | El Dorado | 4.7016 | -74.1469 | 600 |
| GRU | São Paulo Guarulhos | -23.4356 | -46.4731 | 700 |
| SCL | Arturo Merino Benítez | -33.3930 | -70.7858 | 400 |

> **Nota (V50, vigente en producción)**: los 30 nodos del seed se inicializan
> uniformes en `capacidad_almacen = 800`. La tabla anterior describe sólo el
> esqueleto mínimo de ejemplo y puede mostrar valores variados a propósito.

**10 vuelos mínimos entre esos nodos** cubriendo los 5 días de simulación (fechas relativas a `fecha_inicio_virtual` de la sesión).

---

## Dependencias externas

- **BC2:** Escucha `EquipajeIngresado` para calcular rutas. Publica `PlanViajeCreado` que BC1 persiste.
- **BC2:** Escucha `VueloCancelado` para replanificar.
- **Redis:** BC1 escribe `nodo:{id}:ocupacion` y `vuelo:{id}:carga_disponible` al confirmar ingreso.

---

### Serialización de respuestas
- Los campos de `VueloResponse` y sus sub-records se serializan en snake_case mediante `@JsonProperty`.
- Campos afectados: `codigo_vuelo`, `hora_salida`, `hora_llegada`, `capacidad_carga`, `carga_disponible`, `origen_lat`, `origen_lon`, `destino_lat`, `destino_lon`.

### Manejo de errores
- `EquipajeService.ValidacionException` responde con HTTP 422 (UNPROCESSABLE_ENTITY).

## Paquete Java

```
com.tasfb2b.backend.bc1/
├── domain/
│   ├── Equipaje.java
│   ├── PlanViaje.java
│   ├── SegmentoPlan.java
│   ├── Vuelo.java
│   ├── NodoLogistico.java
│   └── PlanVuelos.java
├── application/
│   ├── EquipajeService.java       ← lógica de registro y validación
│   ├── VueloService.java          ← lógica de cancelación y consulta
│   └── PlanViajeService.java      ← persiste el plan devuelto por BC2
└── infrastructure/
    ├── EquipajeRepository.java
    ├── PlanViajeRepository.java
    ├── SegmentoPlanRepository.java
    ├── VueloRepository.java
    ├── NodoLogisticoRepository.java
    ├── PlanVuelosRepository.java
    ├── EquipajeController.java    ← POST /equipajes, PUT /equipajes/{id}, DELETE /equipajes/{id}, GET /equipajes/{id}/plan-viaje
    ├── VueloController.java       ← GET /vuelos, POST /vuelos, PUT /vuelos/{id}, DELETE /vuelos/{id}, POST /simulacion/cancelacion
    └── NodoController.java        ← GET /nodos

---

## ADDED Requirements

### Requirement: Tick de operación no bloqueante
El `OperacionTickService` DEBE ejecutar el ciclo de operación en vivo sin que el reseteo de vuelos bloquee la emisión de telemetría.

#### Scenario: Reseteo diario de vuelos
- **WHEN** inicia un nuevo día operativo (cambio de `LocalDate` en UTC)
- **AND** no hay ninguna sesión de simulación en curso
- **THEN** el sistema DEBE resetear/clonar los vuelos para la nueva fecha UNA SOLA VEZ
- **AND** NO DEBE volver a resetear/clonar hasta que cambie la fecha

#### Scenario: Tick secuencial sin solapamiento
- **WHEN** un tick de operación está en ejecución
- **THEN** el siguiente tick NO DEBE iniciar hasta que el anterior haya completado
- **AND** debe haber una pausa de al menos 1 segundo entre ticks

#### Scenario: Telemetría emitida en cada tick
- **WHEN** el tick de operación se ejecuta
- **AND** no hay sesión de simulación en curso
- **THEN** el sistema DEBE emitir telemetría a todos los clientes WebSocket conectados

### Requirement: Emisión asíncrona de telemetría
La emisión de telemetría vía WebSocket NO DEBE bloquear el ciclo principal del tick de operación.

#### Scenario: Broadcast asíncrono
- **WHEN** el tick de operación llama a `emitirTelemetria()`
- **THEN** el broadcast WebSocket DEBE ejecutarse en un hilo separado
- **AND** el tick DEBE continuar su ejecución sin esperar a que el broadcast complete
```

---

## Clasificación de equipaje por ubicación real en nodos

La lógica de consulta de equipaje en un nodo SHALL utilizar la ubicación real del equipaje (derivada de `SegmentoPlan`, `PlanViaje.ubicacion`, y `vueloActual`) en lugar de los campos `origenIata`/`destinoIata` que representan origen original y destino final.

### Scenario: Consulta de equipaje saliendo de un nodo
- **WHEN** se consultan equipajes saliendo del nodo "LIM"
- **THEN** el sistema SHALL retornar:
  - Equipajes con `estado = "REGISTRADO"` y `origenIata = "LIM"` (recién creados en este nodo)
  - Equipajes con `estado = "ENRUTADO"` cuyo primer segmento del plan de viaje (`orden = 1`, `estado = "PENDIENTE"`) tiene `nodoOrigen.codigoIata = "LIM"`
  - Equipajes con `estado = "EN_ALMACEN"` cuyo último segmento `COMPLETADO` termina en "LIM" Y que tienen al menos un segmento `PENDIENTE` (nodo intermedio esperando próximo vuelo)

### Scenario: Consulta de equipaje llegando a un nodo
- **WHEN** se consultan equipajes llegando al nodo "MIA"
- **THEN** el sistema SHALL retornar:
  - Equipajes con `estado = "EN_ALMACEN"` cuyo último segmento `COMPLETADO` termina en "MIA" Y todos los segmentos están completados (destino final)
  - Equipajes con `estado = "EN_VUELO"` cuyo `vueloActual.destino.codigoIata = "MIA"` (en ruta hacia este nodo)

### Scenario: Límite de resultados
- **WHEN** un nodo tiene más de 200 equipajes que califican como "saliendo"
- **THEN** el sistema SHALL retornar solo los primeros 200, ordenados por `fechaIngreso DESC`

