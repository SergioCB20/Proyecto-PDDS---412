# nodo-envios-clasificacion.md
> **Spec owner:** PM/Lead
> **Estado:** Draft v1
> **Última actualización:** 15/07/2026

---

## Clasificar envíos por dirección en un nodo

El sistema SHALL clasificar los equipajes asociados a un nodo en dos grupos: "saliendo" (equipaje que está físicamente en el nodo esperando su próximo movimiento) y "llegando" (equipaje que ha llegado al nodo o está en ruta hacia él).

### Scenario: Equipaje REGISTRADO en nodo origen
- **WHEN** se consultan los envíos del nodo "LIM"
- **AND** existe un equipaje con `estado = "REGISTRADO"` y `origenIata = "LIM"`
- **THEN** el sistema SHALL incluirlo en la lista "saliendo"

### Scenario: Equipaje ENRUTADO cuyo primer segmento sale del nodo
- **WHEN** se consultan los envíos del nodo "LIM"
- **AND** existe un equipaje con `estado = "ENRUTADO"` cuyo primer segmento del plan de viaje (orden = 1, estado = "PENDIENTE") tiene `nodoOrigen.codigoIata = "LIM"`
- **THEN** el sistema SHALL incluirlo en la lista "saliendo"

### Scenario: Equipaje EN_ALMACEN cuyo último segmento completado termina en el nodo
- **WHEN** se consultan los envíos del nodo "MIA"
- **AND** existe un equipaje con `estado = "EN_ALMACEN"` cuyo último segmento COMPLETADO tiene `nodoDestino.codigoIata = "MIA"`
- **THEN** el sistema SHALL incluirlo en la lista "llegando"

### Scenario: Equipaje EN_VUELO con destino al nodo
- **WHEN** se consultan los envíos del nodo "MIA"
- **AND** existe un equipaje con `estado = "EN_VUELO"` y `vueloActual.destino.codigoIata = "MIA"`
- **THEN** el sistema SHALL incluirlo en la lista "llegando"

### Scenario: Equipaje no debe aparecer duplicado en ambos grupos
- **WHEN** un equipaje califica para "saliendo" y "llegando" simultáneamente (ej: EN_ALMACEN con segmentos completados y pendientes)
- **THEN** el sistema SHALL priorizar "saliendo" si tiene segmentos PENDIENTES, o "llegando" si todos los segmentos están COMPLETADOS

## Incluir conteos agregados en la respuesta

El sistema SHALL incluir conteos de envíos y maletas para cada grupo (saliendo/llegando) en la respuesta del endpoint.

### Scenario: Conteos correctos
- **WHEN** se consultan los envíos del nodo "LIM"
- **AND** hay 3 envíos saliendo con 5, 3 y 2 maletas respectivamente (total 10 maletas)
- **AND** hay 2 envíos llegando con 4 y 6 maletas respectivamente (total 10 maletas)
- **THEN** el sistema SHALL retornar `saliendo_envios = 3`, `saliendo_maletas = 10`, `llegando_envios = 2`, `llegando_maletas = 10`

## Incluir maletas individuales por envío

Cada envío en la respuesta SHALL incluir la lista de sus maletas individuales con su código y tipo (física/virtual).

### Scenario: Maletas físicas
- **WHEN** el envío tiene maletas físicas registradas en la tabla `maletas`
- **THEN** el sistema SHALL listarlas con `virtual = false`

### Scenario: Maletas virtuales (importadas)
- **WHEN** el envío no tiene filas en la tabla `maletas` pero tiene `cantidad > 0`
- **THEN** el sistema SHALL generar N maletas virtuales con código "MAL-{id_externo}-NN" y `virtual = true`
