## ADDED Requirements

### Requirement: Obtener equipajes asignados a un vuelo en sesión

El endpoint `GET /api/sesiones/{id}/envios/vuelo/{vueloId}` SHALL devolver los equipajes que están actualmente asignados al vuelo especificado dentro de la sesión de simulación. La respuesta SHALL incluir para cada equipaje: código IATA de origen, código IATA de destino, código identificador del equipaje (idExterno o UUID), y cantidad de maletas. La respuesta SHALL filtrar solo equipajes cuyo `PlanViaje.sesionId` coincida con el ID de la sesión.

#### Scenario: Envíos encontrados para el vuelo
- **WHEN** se invoca `GET /api/sesiones/{id}/envios/vuelo/{vueloId}` para un vuelo que tiene equipajes asignados dentro de la sesión
- **THEN** la respuesta SHALL ser `200 OK` con un array JSON donde cada elemento contiene `origen_iata`, `destino_iata`, `codigo_equipaje`, y `cantidad`

#### Scenario: Vuelo sin equipajes asignados
- **WHEN** se invoca `GET /api/sesiones/{id}/envios/vuelo/{vueloId}` para un vuelo sin equipajes asignados
- **THEN** la respuesta SHALL ser `200 OK` con un array vacío `[]`

#### Scenario: Sesión no encontrada
- **WHEN** se invoca `GET /api/sesiones/{id}/envios/vuelo/{vueloId}` con un ID de sesión inexistente
- **THEN** la respuesta SHALL ser `404 Not Found`

---

### Requirement: Obtener equipajes almacenados en un nodo en sesión

El endpoint `GET /api/sesiones/{id}/envios/nodo/{nodoIata}` SHALL devolver los equipajes que están actualmente almacenados (estado `EN_ALMACEN`) en el nodo logístico especificado dentro de la sesión de simulación. La respuesta SHALL incluir para cada equipaje: código IATA de origen, código IATA de destino, código identificador del equipaje, y cantidad de maletas.

#### Scenario: Envíos encontrados en el nodo
- **WHEN** se invoca `GET /api/sesiones/{id}/envios/nodo/{nodoIata}` para un nodo que tiene equipajes almacenados dentro de la sesión
- **THEN** la respuesta SHALL ser `200 OK` con un array JSON donde cada elemento contiene `origen_iata`, `destino_iata`, `codigo_equipaje`, y `cantidad`

#### Scenario: Nodo sin equipajes almacenados
- **WHEN** se invoca `GET /api/sesiones/{id}/envios/nodo/{nodoIata}` para un nodo sin equipajes almacenados
- **THEN** la respuesta SHALL ser `200 OK` con un array vacío `[]`

#### Scenario: Nodo IATA no existe
- **WHEN** se invoca `GET /api/sesiones/{id}/envios/nodo/{nodoIata}` con un código IATA de nodo inexistente
- **THEN** la respuesta SHALL ser `404 Not Found`

---

### Requirement: Obtener equipajes entregados recientemente en sesión

El endpoint `GET /api/sesiones/{id}/envios/entregados-recientes?horas=4` SHALL devolver los equipajes con estado `ENTREGADO` cuyo último segmento completado tenga un vuelo cuya `horaLlegada` esté dentro de las últimas N horas virtuales (según el reloj `diaHoraVirtual` de la sesión). El parámetro `horas` SHALL ser opcional con valor por defecto 4. La respuesta SHALL incluir para cada equipaje: código IATA de origen, código IATA de destino, código del vuelo que lo entregó (UT), y cantidad de maletas.

#### Scenario: Entregados recientes encontrados
- **WHEN** se invoca `GET /api/sesiones/{id}/envios/entregados-recientes?horas=4` y existen equipajes entregados dentro de la ventana virtual
- **THEN** la respuesta SHALL ser `200 OK` con un array JSON donde cada elemento contiene `origen_iata`, `destino_iata`, `codigo_vuelo`, y `cantidad`

#### Scenario: Sin entregados en la ventana
- **WHEN** se invoca `GET /api/sesiones/{id}/envios/entregados-recientes` y no hay equipajes entregados en las últimas 4 horas virtuales
- **THEN** la respuesta SHALL ser `200 OK` con un array vacío `[]`

#### Scenario: Parámetro horas personalizado
- **WHEN** se invoca `GET /api/sesiones/{id}/envios/entregados-recientes?horas=24`
- **THEN** la ventana virtual SHALL ser de 24 horas hacia atrás desde `diaHoraVirtual`
