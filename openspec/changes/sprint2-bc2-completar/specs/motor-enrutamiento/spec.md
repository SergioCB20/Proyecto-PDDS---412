## ADDED Requirements

### Requirement: Motor de enrutamiento greedy
El sistema SHALL proveer un servicio stateless `MotorEnrutamiento` que calcule rutas óptimas para equipajes usando un algoritmo greedy que prioriza vuelos directos y, en su defecto, conexiones de 2 escalas con mínimo 60 minutos de conexión.

#### Scenario: Vuelo directo disponible
- **WHEN** existe un vuelo PROGRAMADO desde el nodo origen hacia el destino con carga_disponible > 0 y hora_salida dentro del SLA
- **THEN** el motor retorna un `PlanViaje` con un solo `SegmentoPlan`

#### Scenario: Conexión de 2 escalas necesaria
- **WHEN** no existe vuelo directo pero hay una combinación de 2 vuelos (origen → escala → destino) donde la hora_llegada del primer vuelo + 60 min <= hora_salida del segundo vuelo
- **THEN** el motor retorna un `PlanViaje` con dos `SegmentoPlan` ordenados

#### Scenario: No hay ruta posible
- **WHEN** no existe vuelo directo ni combinación de 2 escalas que respete SLA y capacidad
- **THEN** el motor retorna un `PlanViaje` sin segmentos y estado `INCUMPLIMIENTO_SLA`

#### Scenario: Capacidad de vuelo agotada
- **WHEN** todos los vuelos candidatos tienen carga_disponible <= 0
- **THEN** el motor retorna un `PlanViaje` sin segmentos y estado `INCUMPLIMIENTO_SLA`

### Requirement: Método público del motor
El motor SHALL exponer el método `PlanViaje calcularRuta(UUID equipajeId, String destinoIata, LocalDateTime slaComprometido, UUID sesionId)` que recibe los datos necesarios y retorna el plan calculado sin efectos secundarios.

#### Scenario: Llamada al motor con datos válidos
- **WHEN** se invoca `calcularRuta` con un equipajeId, destinoIata, slaComprometido y sesionId válidos
- **THEN** el motor consulta vuelos PROGRAMADOS desde el nodo origen del equipaje y retorna un `PlanViaje`

#### Scenario: El motor no escribe en base de datos
- **WHEN** se ejecuta `calcularRuta`
- **THEN** no se realizan operaciones de escritura en ninguna tabla de la base de datos
