## ADDED Requirements

### Requirement: Tick de simulación con reloj virtual
El sistema SHALL ejecutar un tick cada 5 segundos reales que avance el reloj virtual de la sesión según el factor de escala configurado (120 horas virtuales en 30-90 min reales).

#### Scenario: Avance del reloj virtual
- **WHEN** se ejecuta un tick
- **THEN** `dia_hora_virtual` de la sesión se incrementa proporcionalmente al factor de escala

### Requirement: Actualización de estados en cada tick
En cada tick, el sistema SHALL detectar vuelos que deben salir o llegar según el reloj virtual y actualizar los estados de equipajes asociados (`EN_ALMACEN` → `EN_VUELO` → `EN_ALMACEN`).

#### Scenario: Vuelo sale según reloj virtual
- **WHEN** `hora_salida` de un vuelo <= `dia_hora_virtual` y el vuelo estaba PROGRAMADO
- **THEN** el vuelo cambia a `EN_RUTA` y los equipajes en ese segmento cambian a `EN_VUELO`

#### Scenario: Vuelo llega según reloj virtual
- **WHEN** `hora_llegada` de un vuelo <= `dia_hora_virtual` y el vuelo estaba EN_RUTA
- **THEN** el vuelo cambia a `COMPLETADO` y los equipajes en ese segmento cambian a `EN_ALMACEN`

### Requirement: Cancelaciones probabilísticas
El sistema SHALL evaluar la probabilidad de cancelación (`prob_cancelacion`) en cada tick y generar cancelaciones aleatorias para vuelos PROGRAMADOS.

#### Scenario: Cancelación aleatoria generada
- **WHEN** un número aleatorio (0-1) es menor que `prob_cancelacion` de la sesión y hay vuelos PROGRAMADOS
- **THEN** se selecciona un vuelo aleatorio, se cancela y se dispara el proceso de replanificación

### Requirement: Escritura de métricas en Redis
En cada tick, el sistema SHALL escribir las métricas actualizadas en Redis con la clave `sesion:{id}:metricas` como JSON string.

#### Scenario: Métricas escritas en Redis
- **WHEN** se completa un tick
- **THEN** se escribe en Redis `sesion:{id}:metricas` con JSON: `{sesion_id, estado, dia_hora_virtual, segundos_reales_transcurridos, sla_acumulado_pct, vuelos_cancelados, maletas_replanificadas}`

### Requirement: Registro de PuntoSLA
El sistema SHALL registrar un `PuntoSLA` cada hora virtual transcurrida con el SLA acumulado y si hubo cancelación en ese momento.

#### Scenario: PuntoSLA registrado cada hora virtual
- **WHEN** `dia_hora_virtual` avanza una hora completa desde el último PuntoSLA
- **THEN** se crea un `PuntoSLA` con `momento_virtual`, `sla_pct`, y `hubo_cancelacion`

### Requirement: Detección de colapso
El sistema SHALL detectar colapso cuando la ocupación de un nodo supere el umbral rojo máximo configurado y marcar la sesión como `COLAPSADA`.

#### Scenario: Sesión colapsada por ocupación
- **WHEN** `ocupacion_actual` de un nodo > `almacen_rojo_max` de la sesión
- **THEN** la sesión cambia a `COLAPSADA` y se registra el punto de colapso en el reporte
