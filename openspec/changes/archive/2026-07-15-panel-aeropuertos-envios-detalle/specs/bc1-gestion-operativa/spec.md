## ADDED Requirements

### Requirement: Clasificación de equipaje por ubicación real en nodos

La lógica de consulta de equipaje en un nodo SHALL utilizar la ubicación real del equipaje (derivada de `SegmentoPlan`, `PlanViaje.ubicacion`, y `vueloActual`) en lugar de los campos `origenIata`/`destinoIata` que representan origen original y destino final.

#### Scenario: Consulta de equipaje saliendo de un nodo
- **WHEN** se consultan equipajes saliendo del nodo "LIM"
- **THEN** el sistema SHALL retornar:
  - Equipajes con `estado = "REGISTRADO"` y `origenIata = "LIM"` (recién creados en este nodo)
  - Equipajes con `estado = "ENRUTADO"` cuyo primer segmento del plan de viaje (`orden = 1`, `estado = "PENDIENTE"`) tiene `nodoOrigen.codigoIata = "LIM"`
  - Equipajes con `estado = "EN_ALMACEN"` cuyo último segmento `COMPLETADO` termina en "LIM" Y que tienen al menos un segmento `PENDIENTE` (nodo intermedio esperando próximo vuelo)

#### Scenario: Consulta de equipaje llegando a un nodo
- **WHEN** se consultan equipajes llegando al nodo "MIA"
- **THEN** el sistema SHALL retornar:
  - Equipajes con `estado = "EN_ALMACEN"` cuyo último segmento `COMPLETADO` termina en "MIA" Y todos los segmentos están completados (destino final)
  - Equipajes con `estado = "EN_VUELO"` cuyo `vueloActual.destino.codigoIata = "MIA"` (en ruta hacia este nodo)

### Requirement: Límite de resultados por consulta

Las consultas de equipaje por nodo SHALL tener un límite de 200 resultados para garantizar performance.

#### Scenario: Límite aplicado
- **WHEN** un nodo tiene más de 200 equipajes que califican como "saliendo"
- **THEN** el sistema SHALL retornar solo los primeros 200, ordenados por `fechaIngreso DESC`
