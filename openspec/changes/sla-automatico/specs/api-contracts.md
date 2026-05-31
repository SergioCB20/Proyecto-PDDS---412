### `POST /equipajes`
Registra un equipaje individual. Solo OPERADOR_LOGISTICO.

**Request:**
```json
{
  "id_equipaje": "MAL-2025-00123",
  "destino_iata": "MIA",
  "vuelo_id": "uuid-vuelo"
}
```
> El SLA (`sla_comprometido`) se calcula automáticamente según los continentes del nodo origen y destino.
> El origen se autocompleta con el nodo asignado al operador autenticado.

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
id_equipaje,destino_iata,vuelo_id
MAL-001,MIA,uuid-vuelo-1
MAL-002,BOG,uuid-vuelo-2
```
> El SLA se calcula automáticamente por el backend en el momento de confirmar.

**Response 200 — Preview de validación:**
```json
{
  "total": 50,
  "validos": 47,
  "con_revision": 3,
  "registros": [
    { "fila": 1, "id_equipaje": "MAL-001", "destino_iata": "MIA", "vuelo_id": "uuid-vuelo-1", "estado_validacion": "VALIDO" },
    { "fila": 4, "id_equipaje": "MAL-004", "destino_iata": "BOG", "vuelo_id": "uuid-xxx", "estado_validacion": "REVISION",
      "motivo": "Vuelo uuid-xxx no existe en el sistema" }
  ]
}
```

---

### `PUT /equipajes/{id}`
Actualiza un equipaje existente. Solo OPERADOR_LOGISTICO.

**Request:**
```json
{
  "destino_iata": "MIA",
  "vuelo_id": "uuid-vuelo"
}
```
> El SLA se recalcula automáticamente usando el origen del vuelo asignado como referencia.
