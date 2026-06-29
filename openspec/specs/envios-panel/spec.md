## ADDED Requirements

### Requirement: Panel de Envíos de Maletas (Operación)
El sistema SHALL proveer un endpoint `GET /api/equipajes/envios-panel` que retorne una lista de maletas agrupables por tipo (planificados, en vuelo, entregados) con filtros opcionales por origen y destino.

#### Scenario: Obtener envíos planificados en operación
- **WHEN** se invoca `GET /api/equipajes/envios-panel?tipo=planificados`
- **THEN** el sistema retorna una lista de maletas en estados REGISTRADO, ENRUTADO o EN_ALMACEN, cada una con `equipaje_id`, `origen_iata`, `destino_iata`, `codigo_vuelo`, `estado` y `cantidad`

#### Scenario: Filtrar envíos planificados por origen en operación
- **WHEN** se invoca `GET /api/equipajes/envios-panel?tipo=planificados&origen_iata=SKBO`
- **THEN** el sistema retorna solo maletas planificadas cuyo `origen_iata` es SKBO

#### Scenario: Filtrar envíos en vuelo por destino en operación
- **WHEN** se invoca `GET /api/equipajes/envios-panel?tipo=en_vuelo&destino_iata=SEQM`
- **THEN** el sistema retorna solo maletas en estado EN_VUELO cuyo `destino_iata` es SEQM

#### Scenario: Obtener entregados recientes en operación
- **WHEN** se invoca `GET /api/equipajes/envios-panel?tipo=entregados`
- **THEN** el sistema retorna maletas en estado ENTREGADO de las últimas 4 horas con su código de vuelo asociado

#### Scenario: Combinar filtros de origen y destino
- **WHEN** se invoca `GET /api/equipajes/envios-panel?tipo=en_vuelo&origen_iata=SKBO&destino_iata=SEQM`
- **THEN** el sistema retorna solo maletas que cumplen ambos filtros

### Requirement: Panel de Envíos de Maletas (Simulación)
El sistema SHALL proveer un endpoint `GET /api/sesiones/{id}/envios/envios-panel` equivalente al de operación pero scoped a una sesión de simulación.

#### Scenario: Obtener envíos en vuelo scoped a sesión
- **WHEN** se invoca `GET /api/sesiones/{id}/envios/envios-panel?tipo=en_vuelo`
- **THEN** el sistema retorna maletas en estado EN_VUELO pertenecientes a la sesión indicada

#### Scenario: Obtener envíos planificados scoped a sesión con filtro de destino
- **WHEN** se invoca `GET /api/sesiones/{sesionId}/envios/envios-panel?tipo=planificados&destino_iata=MIA`
- **THEN** el sistema retorna maletas planificadas de la sesión con destino_iata = MIA

### Requirement: Componente frontend PanelEnviosMaletas
El sistema SHALL proveer un componente React `PanelEnviosMaletas` que muestre tres tabs (Planificados, En Vuelo, Entregados) con filtros de origen y destino, polling automático cuando la sesión está activa, y estilo consistente con los paneles existentes.

#### Scenario: El panel se renderiza con tres tabs y filtros
- **WHEN** el componente se monta
- **THEN** se muestran tres botones de tab (Planificados, En Vuelo, Entregados) y dos selects de filtro (Origen, Destino)

#### Scenario: El panel carga datos al切换 de tab
- **WHEN** el usuario hace clic en el tab "En Vuelo"
- **THEN** el componente invoca la API correspondiente con `tipo=en_vuelo` y los filtros activos, y muestra la lista de resultados

#### Scenario: El panel filtra por origen y destino
- **WHEN** el usuario selecciona un origen en el filtro "Origen"
- **THEN** el componente reinvoca la API con el filtro de origen incluido

#### Scenario: El panel se integra en OperacionView
- **WHEN** la vista OperacionView se renderiza
- **THEN** el componente PanelEnviosMaletas aparece en el sidebar

#### Scenario: El panel se integra en SimulacionView
- **WHEN** la vista SimulacionView se renderiza con una sesión activa
- **THEN** el componente PanelEnviosMaletas aparece en el sidebar, usando las APIs scoped a sesión
