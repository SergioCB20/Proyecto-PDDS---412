## ADDED Requirements

### Requirement: Endpoint WebSocket de telemetría
El sistema SHALL proveer un endpoint WebSocket en `ws://host/api/ws/telemetria?token={jwt}` que autentique al cliente mediante el token JWT en el query param.

#### Scenario: Conexión con token válido
- **WHEN** un cliente se conecta con un token JWT válido en el query param
- **THEN** la conexión se establece y el cliente recibe mensajes de telemetría

#### Scenario: Conexión con token inválido
- **WHEN** un cliente se conecta con un token JWT inválido o ausente
- **THEN** la conexión es rechazada con error 401

### Requirement: Emisión de telemetría por tick
El servidor SHALL emitir un mensaje JSON cada tick (~5 segundos) con la estructura: `{timestamp, nodos[], vuelos[], metricas_sesion}`.

#### Scenario: Mensaje de telemetría emitido
- **WHEN** se completa un tick del TickService
- **THEN** se emite a todos los clientes conectados un JSON con posiciones de nodos (id, codigo_iata, lat, lon, ocupacion_pct, color) y vuelos (id, codigo_vuelo, estado, lat_actual, lon_actual, ocupacion_pct, color)

### Requirement: Cálculo de posición de vuelos
Para vuelos EN_RUTA, el sistema SHALL interpolar la posición actual del avión entre origen y destino según el progreso del vuelo en el reloj virtual.

#### Scenario: Posición interpolada de vuelo en ruta
- **WHEN** un vuelo está EN_RUTA y `dia_hora_virtual` está entre `hora_salida` y `hora_llegada`
- **THEN** `lat_actual` y `lon_actual` se calculan por interpolación lineal entre las coordenadas de origen y destino
