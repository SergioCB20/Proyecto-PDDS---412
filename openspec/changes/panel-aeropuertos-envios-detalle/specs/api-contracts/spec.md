## ADDED Requirements

### Requirement: Endpoint GET /api/nodos/{iata}/envios

El sistema SHALL exponer un nuevo endpoint `GET /api/nodos/{iata}/envios` para consultar los envíos clasificados por dirección en un nodo logístico.

**Rol requerido:** OPERADOR_LOGISTICO, ANALISTA, ADMINISTRADOR  
**Path param:** `iata` — Código IATA del nodo (string, 3 caracteres)

#### Scenario: Respuesta exitosa 200
- **WHEN** se invoca `GET /api/nodos/LIM/envios`
- **THEN** el sistema SHALL responder con status 200
- **AND** el body SHALL tener la estructura:
```json
{
  "nodo_iata": "LIM",
  "saliendo": [
    {
      "id": "uuid-envio",
      "codigo_equipaje": "ENV-ABC123",
      "origen_iata": "LIM",
      "destino_iata": "MAD",
      "cantidad": 3,
      "estado": "ENRUTADO",
      "codigo_vuelo": "IB1234",
      "fecha_ingreso": "2026-07-15T10:00:00Z",
      "maletas": [
        { "id": "uuid", "codigo_maleta": "MAL-ENV-ABC123-01", "equipaje_id": "uuid", "equipaje_id_externo": "ENV-ABC123", "created_at": "...", "virtual": false },
        { "id": "uuid", "codigo_maleta": "MAL-ENV-ABC123-02", "equipaje_id": "uuid", "equipaje_id_externo": "ENV-ABC123", "created_at": "...", "virtual": false }
      ]
    }
  ],
  "llegando": [
    {
      "id": "uuid-envio",
      "codigo_equipaje": "ENV-DEF456",
      "origen_iata": "MEX",
      "destino_iata": "LIM",
      "cantidad": 2,
      "estado": "EN_ALMACEN",
      "codigo_vuelo": "AM789",
      "fecha_ingreso": "2026-07-14T22:00:00Z",
      "maletas": []
    }
  ],
  "conteo": {
    "saliendo_envios": 1,
    "saliendo_maletas": 3,
    "llegando_envios": 1,
    "llegando_maletas": 2
  }
}
```

#### Scenario: Error 404 — Nodo no encontrado
- **WHEN** se invoca `GET /api/nodos/XYZ/envios` y el código IATA "XYZ" no existe
- **THEN** el sistema SHALL responder con status 404

#### Scenario: Error 422 — IATA inválido
- **WHEN** se invoca `GET /api/nodos//envios` con IATA vacío
- **THEN** el sistema SHALL responder con status 400

### Requirement: Cache de maletas por equipaje en la respuesta

El campo `maletas` de cada envío SHALL incluir la lista completa de maletas asociadas, utilizando la misma lógica que `GET /api/equipajes/{idExterno}/maletas` (físicas + virtuales si no hay físicas).

#### Scenario: Incluir maletas virtuales si no hay físicas
- **WHEN** un envío tiene `cantidad = 3` pero no tiene registros en la tabla `maletas`
- **THEN** el campo `maletas` SHALL contener 3 entradas virtuales con `codigo_maleta = "MAL-{id_externo}-01"`, `"MAL-{id_externo}-02"`, `"MAL-{id_externo}-03"` y `virtual = true`
