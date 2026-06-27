## ADDED Requirements

### Requirement: Textos visibles renombrados
Todos los textos visibles al usuario que contengan "Nodo" o "Nodos" DEBEN ser renombrados a "Aeropuerto" o "Aeropuertos" respectivamente.

#### Scenario: Labels de formulario de envío Individual
- **WHEN** el usuario abre el panel de envío Individual en Operación
- **THEN** el label del Select de origen dice "Aeropuerto Origen" en vez de "Nodo Origen"

#### Scenario: Encabezados de panel de aeropuertos
- **WHEN** el usuario ve el panel de aeropuertos en Operación o Simulación
- **THEN** el encabezado dice "Aeropuertos" en vez de "Nodos"

#### Scenario: Texto de estado vacío en panel de aeropuertos
- **WHEN** no hay datos de aeropuertos
- **THEN** el texto informativo dice "Sin datos de aeropuertos" en vez de "Sin datos de nodos"

#### Scenario: Texto de filtro sin resultados
- **WHEN** ningún aeropuerto coincide con los filtros aplicados
- **THEN** el mensaje dice "Ningún aeropuerto coincide con los filtros"

#### Scenario: Leyenda del mapa
- **WHEN** el usuario ve la leyenda del mapa
- **THEN** la sección de ocupación dice "Ocupación Aeropuertos" en vez de "Ocupación Nodos"

#### Scenario: Placeholder del Select de origen
- **WHEN** no hay aeropuertos cargados
- **THEN** el placeholder del Select dice "No hay aeropuertos"

#### Scenario: Placeholder del Select de origen con datos
- **WHEN** hay aeropuertos disponibles
- **THEN** el placeholder del Select dice "Seleccionar aeropuerto origen"

#### Scenario: Título de panel de envíos por aeropuerto
- **WHEN** el usuario selecciona un aeropuerto y ve sus envíos
- **THEN** el título del panel dice "Envíos en aeropuerto X" en vez de "Envíos en nodo X"

#### Scenario: Mensaje de error de origen no especificado (backend)
- **WHEN** el backend rechaza la petición por falta de header de aeropuerto origen
- **THEN** el mensaje de error dice "Aeropuerto de origen no especificado" en vez de "Nodo de origen no especificado"