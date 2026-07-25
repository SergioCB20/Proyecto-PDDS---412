# Escenario: Operaciones Día a Día

Sistema TASF B2B en modo operación diaria (no simulación).
Modo wall-clock, sin reloj virtual.

## Fases

### 1. Preparación (admin)

- POST /api/operacion/preparacion?hora=HH:MM
  - Setea capacidades SPIM/SABE/EKCH/VIDP → 999
  - Carga planes de vuelo adicionales (tag=`tag_dia_a_dia`)
  - Parsea archivo formato: `ORIG-DEST-HO:MO-HD:MD-####`
  - Limpia tabla equipajes donde tag IS NULL (borra registros previos de operación)
  - NO toca simulación ni plantillas

- GET /api/operacion/preparacion/estado
  - Muestra capacidades actuales + conteos

- POST /api/operacion/preparacion/restaurar
  - Restaura SPIM:440, SABE:460, EKCH:480, VIDP:480
  - DELETE vuelos WHERE tag='tag_dia_a_dia'
  - DELETE equipajes WHERE tag='tag_dia_a_dia'

### 2. Recepción (operador logístico)

Pantalla independiente `/recepcion` sin mapa.

- Wizard 1-click: elegir sede SPIM/SABE/EKCH/VIDP
- Header: aeropuerto + TZ + hora local en vivo
- Form individual: destino + cantidad (origen implícito por device)
- Carga archivo formato curso: `id-aaaammdd-hh-mm-dest-###-IdClien`
- Lista confirmados recientes (polling cada 5s)

### 3. Monitoreo (OperacionView)

Mapa + dock sidebar.
- Quitado: registro de equipaje (en recepción ahora)
- Quitado: carga masiva
- Quitado: hardcoded baseDate
- Mantiene: mapa, métricas, control inicio/pausa/detener, cancelación con modal

### 4. Cancelación + Replanificación

POST /api/operacion/cancelacion
- Auto-resuelve sesión EN_VIVO activa
- Reusa CancelacionService
- Modal en frontend: causa + equipajes reasignados

### 5. Cleanup

POST /api/operacion/preparacion/restaurar (ejecutado manual al final de la prueba)