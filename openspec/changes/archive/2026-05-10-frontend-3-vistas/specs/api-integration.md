# API Integration Spec

## Status: INTEGRADO EN FRONTEND

## Endpoints Consumidos

### Autenticacion

#### POST /api/auth/login
**Request:**
```json
{ "correo": "string", "password": "string" }
```
**Response 200:**
```json
{
  "token": "eyJ...",
  "usuario": {
    "id": "uuid",
    "nombre": "string",
    "correo": "string",
    "rol": "ADMINISTRADOR | OPERADOR_LOGISTICO | ANALISTA",
    "nodo_ref_id": "uuid | null"
  }
}
```
**Errores:**
- 401: credenciales invalidas
- 403: usuario inactivo

---

### Usuarios

#### GET /api/usuarios?page=0&size=10&estado=ACTIVO
**Headers:** `Authorization: Bearer {token}` (requiere ADMIN)

**Response 200:**
```json
{
  "content": [
    {
      "id": "uuid",
      "nombre": "string",
      "correo": "string",
      "rol": "string",
      "estado": "ACTIVO | INACTIVO",
      "nodo_ref_id": "uuid | null",
      "nodo_nombre": "string | null"
    }
  ],
  "totalElements": 15,
  "totalPages": 2
}
```

#### POST /api/usuarios
**Headers:** `Authorization: Bearer {token}` (requiere ADMIN)
**Request:**
```json
{ "nombre": "string", "correo": "string", "password": "string", "rol": "string", "nodo_ref_id": "uuid | null" }
```
**Response 201:** Usuario creado

#### PUT /api/usuarios/{id}
**Headers:** `Authorization: Bearer {token}` (requiere ADMIN)
**Request:**
```json
{ "nombre": "string" }
```

#### PATCH /api/usuarios/{id}/estado
**Headers:** `Authorization: Bearer {token}` (requiere ADMIN)
**Request:**
```json
{ "estado": "ACTIVO | INACTIVO" }
```

---

### Nodos

#### GET /api/nodos
**Headers:** `Authorization: Bearer {token}` (todos los roles)

**Response 200:**
```json
[
  {
    "id": "uuid",
    "codigo_iata": "LIM",
    "nombre": "Aeropuerto Jorge Chavez",
    "latitud": -12.0219,
    "longitud": -77.1143,
    "capacidad_almacen": 500,
    "ocupacion_actual": 120
  }
]
```

---

### Vuelos

#### GET /api/vuelos?estado=PROGRAMADO&page=0&size=20
**Headers:** `Authorization: Bearer {token}` (todos los roles)

**Response 200:**
```json
{
  "content": [
    {
      "id": "uuid",
      "codigo_vuelo": "LA2401",
      "estado": "PROGRAMADO | EN_RUTA | CANCELADO | COMPLETADO",
      "origen": { "id": "uuid", "codigo_iata": "LIM", "nombre": "Jorge Chavez" },
      "destino": { "id": "uuid", "codigo_iata": "MIA", "nombre": "Miami Intl" },
      "hora_salida": "2025-06-15T14:30:00Z",
      "hora_llegada": "2025-06-15T22:00:00Z",
      "capacidad_carga": 200,
      "carga_disponible": 85
    }
  ],
  "totalElements": 10,
  "totalPages": 1
}
```

---

### Equipajes

#### GET /api/equipajes/{id}/plan-viaje
**Headers:** `Authorization: Bearer {token}` (OPERADOR)

**Response 200:**
```json
{
  "equipaje_id": "uuid",
  "estado": "EN_VUELO",
  "ubicacion_actual": {
    "tipo": "VUELO | NODO",
    "referencia_id": "uuid",
    "lat": -5.2,
    "lon": -62.3
  },
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
```

## Estructura de Errores (todos los endpoints)

```json
{
  "status": 422,
  "error": "CAPACIDAD_SUPERADA",
  "mensaje": "La confirmacion del ingreso superaria el 100%"
}
```

## Variables de Entorno

```
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```