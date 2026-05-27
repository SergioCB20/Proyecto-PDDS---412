## ADDED Requirements

### Requirement: PUT /api/equipajes/{id}

Actualiza un equipaje existente. Solo OPERADOR_LOGISTICO.

**Request:**
```json
{
  "destino_iata": "MIA",
  "vuelo_id": "uuid-vuelo",
  "sla_comprometido": "2025-06-16T08:00:00Z"
}
```

**Response 200:** `EquipajeResponse` (misma estructura que POST /api/equipajes).

**Errores:**
- `404` — Equipaje no encontrado
- `422` — Destino IATA no existe
- `422` — Vuelo no encontrado

### Requirement: DELETE /api/equipajes/{id}

Elimina un equipaje y su plan de viaje. Solo OPERADOR_LOGISTICO.

**Response 204:** Sin contenido.

**Errores:**
- `404` — Equipaje no encontrado

### Requirement: POST /api/vuelos

Crea un nuevo vuelo. Solo OPERADOR_LOGISTICO.

**Request:**
```json
{
  "codigo_vuelo": "LA2402",
  "origen_id": "uuid-origen",
  "destino_id": "uuid-destino",
  "hora_salida": "2025-06-16T14:30:00Z",
  "hora_llegada": "2025-06-16T22:00:00Z",
  "capacidad_carga": 200
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "codigo_vuelo": "LA2402",
  "estado": "PROGRAMADO",
  "origen": { "id": "uuid", "codigo_iata": "LIM", "nombre": "Jorge Chávez" },
  "destino": { "id": "uuid", "codigo_iata": "MIA", "nombre": "Miami Intl" },
  "hora_salida": "2025-06-16T14:30:00Z",
  "hora_llegada": "2025-06-16T22:00:00Z",
  "capacidad_carga": 200,
  "carga_disponible": 200,
  "origen_lat": -12.0219,
  "origen_lon": -77.1143,
  "destino_lat": 25.7959,
  "destino_lon": -80.2870
}
```

**Errores:**
- `422` — Origen no encontrado
- `422` — Destino no encontrado

### Requirement: PUT /api/vuelos/{id}

Actualiza un vuelo existente (solo PROGRAMADO). Solo OPERADOR_LOGISTICO.

**Request:** Mismo cuerpo que POST /api/vuelos.

**Response 200:** `VueloResponse` actualizado.

**Errores:**
- `404` — Vuelo no encontrado
- `422` — Vuelo no está PROGRAMADO
- `422` — Origen no encontrado
- `422` — Destino no encontrado

### Requirement: DELETE /api/vuelos/{id}

Elimina un vuelo (solo PROGRAMADO sin equipajes). Solo OPERADOR_LOGISTICO.

**Response 204:** Sin contenido.

**Errores:**
- `404` — Vuelo no encontrado
- `422` — Vuelo no está PROGRAMADO o tiene equipajes asignados

## MODIFIED Requirements

### Requirement: Autorización para endpoints de vuelo

En `SecurityConfig.java`, los métodos POST, PUT, DELETE en `/api/vuelos/**` SHALL requerir rol `OPERADOR_LOGISTICO`.

### Requirement: Respuesta de vuelos incluye coordenadas

La respuesta de `GET /api/vuelos` y `GET /api/vuelos/{id}` SHALL incluir los campos adicionales en snake_case:

```json
{
  "origen_lat": -12.0219,
  "origen_lon": -77.1143,
  "destino_lat": 25.7959,
  "destino_lon": -80.2870
}
```
