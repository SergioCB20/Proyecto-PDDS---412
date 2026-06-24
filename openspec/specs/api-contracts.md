# api-contracts.md
> **Spec owner:** PM/Lead  
> **Estado:** Draft v1  
> **Última actualización:** 10/05/2026  
> **Consumidores:** Backend devs implementa · Frontend devs consume

---

## Convenciones globales

| Convención | Detalle |
|---|---|
| Base URL | `http://{host}/api` |
| Autenticación | Header `Authorization: Bearer {jwt_token}` en todos los endpoints salvo `/auth/**` |
| Content-Type | `application/json` salvo endpoints de carga de archivos |
| Fechas | ISO 8601 — `2025-06-15T14:30:00Z` |
| IDs | UUID v4 como string — `"550e8400-e29b-41d4-a716-446655440000"` |
| Paginación | Query params `?page=0&size=20` cuando aplica |
| Errores | Estructura estándar (ver sección de errores al final) |

### Roles y acceso

| Endpoint | ADMINISTRADOR | OPERADOR_LOGISTICO | ANALISTA |
|---|---|---|---|
| `/auth/**` | ✓ | ✓ | ✓ |
| `/usuarios/**` | ✓ | — | — |
| `/equipajes/**` | — | ✓ | — |
| `GET /vuelos` | ✓ | ✓ | ✓ |
| `POST /vuelos` | — | ✓ | — |
| `PUT /vuelos/{id}` | — | ✓ | — |
| `DELETE /vuelos/{id}` | — | ✓ | — |
| `/manifiestos/**` | — | ✓ | — |
| `/sesiones/**` | — | — | ✓ |
| `/eventos/**` | — | — | ✓ |
| `/nodos/**` | ✓ | ✓ | ✓ |
| `/simulacion/cancelacion` | — | ✓ | — |

---

## BC3 — Identidad y Acceso

### `POST /auth/login`
Autentica al usuario y devuelve un JWT.

**Request:**
```json
{
  "correo": "operador@empresa.com",
  "password": "secreto123"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "usuario": {
    "id": "uuid",
    "nombre": "Juan Pérez",
    "correo": "operador@empresa.com",
    "rol": "OPERADOR_LOGISTICO",
    "nodo_ref_id": "uuid-nodo"
  }
}
```

**Errores:**
- `401` — Credenciales inválidas
- `403` — Usuario inactivo

---

### `GET /usuarios`
Lista todos los usuarios. Solo ADMINISTRADOR.

**Query params:** `?page=0&size=20&estado=ACTIVO`

**Response 200:**
```json
{
  "content": [
    {
      "id": "uuid",
      "nombre": "Juan Pérez",
      "correo": "operador@empresa.com",
      "rol": "OPERADOR_LOGISTICO",
      "estado": "ACTIVO",
      "nodo_ref_id": "uuid-nodo",
      "nodo_nombre": "Aeropuerto Jorge Chávez"
    }
  ],
  "totalElements": 15,
  "totalPages": 1
}
```

---

### `POST /usuarios`
Crea un nuevo usuario. Solo ADMINISTRADOR.

**Request:**
```json
{
  "nombre": "Ana García",
  "correo": "ana@empresa.com",
  "password": "temporal123",
  "rol": "ANALISTA",
  "nodo_ref_id": "uuid-nodo"
}
```

**Response 201:**
```json
{
  "id": "uuid-nuevo",
  "nombre": "Ana García",
  "correo": "ana@empresa.com",
  "rol": "ANALISTA",
  "estado": "ACTIVO"
}
```

**Errores:**
- `409` — Correo ya registrado
- `400` — Campos obligatorios faltantes

---

### `PUT /usuarios/{id}`
Actualiza datos de un usuario. No permite cambiar `rol` ni `nodo_ref_id`. Solo ADMINISTRADOR.

**Request:**
```json
{
  "nombre": "Ana García Actualizada"
}
```

**Response 200:** Usuario actualizado (misma estructura que POST).

---

### `PATCH /usuarios/{id}/estado`
Activa o inactiva un usuario. Solo ADMINISTRADOR.

**Request:**
```json
{
  "estado": "INACTIVO"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "estado": "INACTIVO"
}
```

---

## BC1 — Gestión Operativa

### `GET /nodos`
Lista todos los nodos logísticos activos.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "codigo_iata": "LIM",
    "nombre": "Aeropuerto Jorge Chávez",
    "latitud": -12.0219,
    "longitud": -77.1143,
    "capacidad_almacen": 500,
    "ocupacion_actual": 120
  }
]
```

---

### `GET /vuelos`
Lista vuelos con filtros. Acceso: todos los roles.

**Query params:** `?estado=PROGRAMADO&fecha_desde=2025-06-01&fecha_hasta=2025-06-30&destino_iata=MIA&page=0&size=20`

**Response 200:**
```json
{
  "content": [
    {
      "id": "uuid",
      "codigo_vuelo": "LA2401",
      "estado": "PROGRAMADO",
      "origen": { "id": "uuid", "codigo_iata": "LIM", "nombre": "Jorge Chávez" },
      "destino": { "id": "uuid", "codigo_iata": "MIA", "nombre": "Miami Intl" },
      "hora_salida": "2025-06-15T14:30:00Z",
      "hora_llegada": "2025-06-15T22:00:00Z",
      "capacidad_carga": 200,
      "carga_disponible": 85,
      "origen_lat": -12.0219,
      "origen_lon": -77.1143,
      "destino_lat": 25.7959,
      "destino_lon": -80.2870
    }
  ],
  "totalElements": 42,
  "totalPages": 3
}
```

---

### `POST /vuelos`
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

---

### `PUT /vuelos/{id}`
Actualiza un vuelo existente (solo PROGRAMADO). Solo OPERADOR_LOGISTICO.

**Request:** Mismo cuerpo que POST /api/vuelos.

**Response 200:** `VueloResponse` actualizado.

**Errores:**
- `404` — Vuelo no encontrado
- `422` — Vuelo no está PROGRAMADO
- `422` — Origen no encontrado
- `422` — Destino no encontrado

---

### `DELETE /vuelos/{id}`
Elimina un vuelo (solo PROGRAMADO sin equipajes). Solo OPERADOR_LOGISTICO.

**Response 204:** Sin contenido.

**Errores:**
- `404` — Vuelo no encontrado
- `422` — Vuelo no está PROGRAMADO o tiene equipajes asignados

---

### `POST /equipajes`
Registra un equipaje individual. Solo OPERADOR_LOGISTICO.

**Request:**
```json
{
  "id_equipaje": "MAL-2025-00123",
  "destino_iata": "MIA",
  "vuelo_id": "uuid-vuelo",
  "sla_comprometido": "2025-06-16T08:00:00Z"
}
```
> El origen y cliente se autocompletán con el nodo asignado al operador autenticado.

**Response 201:**
```json
{
  "id": "uuid-equipaje",
  "estado": "ENRUTADO",
  "plan_viaje": {
    "id": "uuid-plan",
    "estado_sla": "EN_TIEMPO",
    "tiempo_entrega_est": "2025-06-16T06:30:00Z",
    "segmentos": [
      {
        "orden": 1,
        "vuelo_codigo": "LA2401",
        "nodo_origen": "LIM",
        "nodo_destino": "MIA",
        "hora_salida_prog": "2025-06-15T14:30:00Z"
      }
    ]
  }
}
```

**Errores:**
- `409` — Vuelo no existe o no está activo
- `422` — Capacidad del almacén superada al 100%
- `422` — Capacidad del vuelo agotada

---

### `POST /equipajes/carga-masiva`
Carga masiva de equipajes desde CSV. Solo OPERADOR_LOGISTICO.

**Request:** `multipart/form-data` con campo `archivo` tipo `.csv`

**Formato CSV esperado:**
```
id_equipaje,destino_iata,vuelo_id,sla_comprometido
MAL-001,MIA,uuid-vuelo-1,2025-06-16T08:00:00Z
MAL-002,BOG,uuid-vuelo-2,2025-06-17T10:00:00Z
```

**Response 200 — Preview de validación:**
```json
{
  "total": 50,
  "validos": 47,
  "con_revision": 3,
  "registros": [
    { "fila": 1, "id_equipaje": "MAL-001", "estado_validacion": "VALIDO" },
    { "fila": 4, "id_equipaje": "MAL-004", "estado_validacion": "REVISION",
      "motivo": "Vuelo uuid-xxx no existe en el sistema" }
  ]
}
```

---

### `POST /equipajes/carga-masiva/confirmar`
Confirma e ingresa solo los registros válidos del preview. Solo OPERADOR_LOGISTICO.

**Request:**
```json
{
  "ids_equipaje": ["MAL-001", "MAL-002", "MAL-003"]
}
```

**Response 201:**
```json
{
  "ingresados": 47,
  "fallidos": 0
}
```

---

### `PUT /equipajes/{id}`
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

---

### `DELETE /equipajes/{idExterno}`
Elimina un equipaje y su plan de viaje. Solo OPERADOR_LOGISTICO.

`{idExterno}` es el identificador externo del equipaje (ej. `MAL-2025-00123`).

**Response 204:** Sin contenido.

**Errores:**
- `404` — Equipaje no encontrado

---

### `GET /equipajes/{id}/plan-viaje`
Consulta el plan de viaje actual de un equipaje.

**Response 200:**
```json
{
  "equipaje_id": "uuid",
  "estado": "EN_VUELO",
  "ubicacion_actual": {
    "tipo": "VUELO",
    "referencia_id": "uuid-vuelo",
    "lat": -5.2,
    "lon": -62.3
  },
  "estado_sla": "EN_TIEMPO",
  "tiempo_entrega_est": "2025-06-16T06:30:00Z",
  "segmentos": []
}
```

---

### `POST /simulacion/cancelacion`
Simula la cancelación de un vuelo (reemplaza al PSS externo). Solo OPERADOR_LOGISTICO.

**Request:**
```json
{
  "vuelo_id": "uuid-vuelo",
  "causa": "Falla técnica en aeronave"
}
```

**Response 200:**
```json
{
  "vuelo_id": "uuid-vuelo",
  "estado_nuevo": "CANCELADO",
  "equipajes_afectados": 12,
  "lote_replanificacion_id": "uuid-lote"
}
```

---

### `GET /manifiestos/{vuelo_id}`
Genera y descarga el manifiesto PDF de un vuelo. Solo OPERADOR_LOGISTICO.

**Response 200:** `Content-Type: application/pdf`  
Archivo PDF descargable con nombre `manifiesto_{codigo_vuelo}_{fecha}.pdf`

**Errores:**
- `404` — Vuelo no encontrado
- `422` — El vuelo no tiene equipajes asignados

---

## BC2 — Planificación y Replanificación

### `POST /sesiones`
Crea y configura una nueva sesión de simulación. Solo ANALISTA.

La simulación siempre corre **5 días virtuales**. Al iniciarse, el sistema alinea
automáticamente las fechas de las bolsas con el `fecha_inicio_virtual` elegido.

**Request:**
```json
{
  "tipo": "SIMULADA",
  "fecha_inicio_virtual": "2026-01-02",
  "hora_inicio_virtual": "00:00:00",
  "prob_cancelacion": 0.15,
  "k": 120,
  "sa_segundos": 30,
  "ventana_horas": 4,
  "umbrales_almacen": {
    "verde_min": 0, "verde_max": 70,
    "ambar_min": 70, "ambar_max": 90,
    "rojo_min": 90, "rojo_max": 100
  },
  "umbrales_vuelo": {
    "verde_min": 0, "verde_max": 75,
    "ambar_min": 75, "ambar_max": 90,
    "rojo_min": 90, "rojo_max": 100
  }
}
```

**Parámetros de planificación fija:**

| Campo | Tipo | Default | Descripción |
|---|---|---|---|
| `k` | Double | 120 | Factor tiempo_virtual/tiempo_real. k=120 → 60 min real; k=240 → 30 min real. Rango: 120–240. |
| `sa_segundos` | Integer | 30 | Salto del algoritmo: cada cuántos segundos reales se ejecuta el planificador ACO. |
| `ventana_horas` | Integer | 4 | Ventana de planificación: cuántas horas virtuales adelante planifica el ACO cada vez. |
```

**Response 201:**
```json
{
  "id": "uuid-sesion",
  "tipo": "SIMULADA",
  "estado": "CONFIGURADA"
}
```

---

### `POST /sesiones/{id}/iniciar`
Inicia la ejecución de una sesión. Solo ANALISTA.

**Response 200:**
```json
{
  "id": "uuid-sesion",
  "estado": "EN_CURSO",
  "fecha_inicio_real": "2025-06-10T09:00:00Z"
}
```

---

### `POST /sesiones/{id}/pausar`
Pausa la sesión en curso. Solo ANALISTA.

**Response 200:** `{ "estado": "PAUSADA" }`

---

### `POST /sesiones/{id}/detener`
Detiene y finaliza la sesión. Solo ANALISTA.

**Response 200:** `{ "estado": "FINALIZADA" }`

---

### `GET /sesiones/{id}/metricas`
Obtiene las métricas en vivo de una sesión activa. Solo ANALISTA.

**Response 200:**
```json
{
  "sesion_id": "uuid",
  "estado": "EN_CURSO",
  "dia_hora_virtual": "2025-06-02T14:30:00Z",
  "segundos_reales_transcurridos": 1240,
  "sla_acumulado_pct": 94.3,
  "vuelos_cancelados": 2,
  "maletas_replanificadas": 18
}
```

---

### `GET /sesiones/{id}/reporte`
Obtiene el reporte final de una sesión finalizada. Solo ANALISTA.

**Response 200:**
```json
{
  "sesion_id": "uuid",
  "sla_incumplido_pct": 5.7,
  "total_replanificadas": 18,
  "punto_colapso_virtual": null,
  "nodo_colapso_ref_id": null,
  "causa_colapso": null,
  "serie_sla": [
    {
      "momento_virtual": "2025-06-01T08:00:00Z",
      "sla_pct": 100.0,
      "hubo_cancelacion": false
    },
    {
      "momento_virtual": "2025-06-01T14:00:00Z",
      "sla_pct": 96.5,
      "hubo_cancelacion": true,
      "vuelo_cancelado_ref_id": "uuid-vuelo"
    }
  ]
}
```

---

### `GET /eventos/planificacion`
Streaming SSE (Server-Sent Events) de eventos de planificación en vivo. Solo ANALISTA.

> **Nota:** Se usa query param `?token=` en lugar de header `Authorization` porque `EventSource` nativo del navegador no permite personalizar cabeceras HTTP. El `JwtFilter` reconoce automáticamente el token vía query param.

**Query params:** `?token={jwt_token}`

**Response 200:** `Content-Type: text/event-stream`

Cada evento SSE tiene el formato estándar:
```
event: planificacion
data: { ...json... }
```

**Eventos emitidos:**

| event | Disparo | data |
|---|---|---|
| `planificacion` | Cada tick de simulación (~5s) | Payload de métricas (ver abajo) |
| `cancelacion` | Un vuelo es cancelado | `{ "vuelo_id": "uuid", "causa": "...", "equipajes_afectados": 12 }` |
| `replanificacion` | Lote de equipajes replanificado | `{ "lote_id": "uuid", "equipajes": 5, "sesion_id": "uuid" }` |
| `sesion_terminada` | La sesión finaliza | `{ "sesion_id": "uuid", "reporte_url": "/api/sesiones/{id}/reporte" }` |
| `heartbeat` | Cada 30s para mantener conexión | `{ "timestamp": "..." }` |

**Payload del evento `planificacion`:**
```json
{
  "timestamp": "2025-06-10T09:05:00Z",
  "dia_hora_virtual": "2025-06-02T14:30:00Z",
  "sla_acumulado_pct": 94.3,
  "vuelos_cancelados": 2,
  "maletas_replanificadas": 18
}
```

**Errores:**
- `401` — Token ausente, inválido o expirado
- `403` — Rol sin permiso (solo ANALISTA)
- `503` — No hay sesión activa en este momento

---

## WebSocket — Telemetría en tiempo real

**Endpoint:** `ws://{host}/api/ws/telemetria`  
**Autenticación:** Query param `?token={jwt_token}`

### Mensaje emitido por el servidor (cada tick ~5s)

```json
{
  "timestamp": "2025-06-10T09:05:00Z",
  "nodos": [
    {
      "id": "uuid",
      "codigo_iata": "LIM",
      "lat": -12.0219,
      "lon": -77.1143,
      "ocupacion_pct": 75.4,
      "color": "AMBAR"
    }
  ],
  "vuelos": [
    {
      "id": "uuid",
      "codigo_vuelo": "LA2401",
      "estado": "EN_RUTA",
      "lat_actual": -8.5,
      "lon_actual": -70.2,
      "ocupacion_pct": 60.0,
      "color": "VERDE"
    }
  ],
  "metricas_sesion": {
    "sesion_id": "uuid",
    "tipo": "EN_VIVO",
    "sla_acumulado_pct": 97.2,
    "vuelos_cancelados": 1,
    "maletas_replanificadas": 5
  }
}
```

---

## Estructura de errores estándar

Todos los errores siguen esta estructura:

```json
{
  "timestamp": "2025-06-10T09:05:00Z",
  "status": 422,
  "error": "CAPACIDAD_SUPERADA",
  "mensaje": "La confirmación del ingreso superaría el 100% de capacidad del almacén LIM.",
  "path": "/api/equipajes"
}
```

| Código HTTP | Cuándo usarlo |
|---|---|
| `400` | Campos faltantes o formato inválido |
| `401` | Token ausente o expirado |
| `403` | Rol sin permiso para el endpoint |
| `404` | Recurso no encontrado |
| `409` | Conflicto — recurso ya existe |
| `422` | Regla de negocio violada (capacidad, vuelo inactivo, etc.) |
| `500` | Error interno inesperado |
