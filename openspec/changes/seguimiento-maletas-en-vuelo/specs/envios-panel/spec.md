## MODIFIED Requirements

### Requirement: Panel de Envíos de Maletas (Operación)
El sistema SHALL proveer un endpoint `GET /api/equipajes/envios-panel` que retorne una lista de maletas agrupables por tipo (planificados, en vuelo, entregados) con filtros opcionales por origen, destino y código de maleta.

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

#### Scenario: Filtrar por código de maleta en operación
- **WHEN** se invoca `GET /api/equipajes/envios-panel?tipo=en_vuelo&codigo_equipaje=MAL-001`
- **THEN** el sistema retorna solo maletas cuyo `id_externo` contiene "MAL-001" (búsqueda LIKE parcial)

#### Scenario: Combinar código de maleta con otros filtros
- **WHEN** se invoca `GET /api/equipajes/envios-panel?tipo=en_vuelo&codigo_equipaje=MAL&origen_iata=SKBO`
- **THEN** el sistema retorna solo maletas que cumplen todos los filtros simultáneamente

### Requirement: Panel de Envíos de Maletas (Simulación)
El sistema SHALL proveer un endpoint `GET /api/sesiones/{id}/envios/envios-panel` equivalente al de operación pero scoped a una sesión de simulación, con el mismo filtro adicional de código de maleta.

#### Scenario: Obtener envíos en vuelo scoped a sesión
- **WHEN** se invoca `GET /api/sesiones/{id}/envios/envios-panel?tipo=en_vuelo`
- **THEN** el sistema retorna maletas en estado EN_VUELO pertenecientes a la sesión indicada

#### Scenario: Obtener envíos planificados scoped a sesión con filtro de destino
- **WHEN** se invoca `GET /api/sesiones/{sesionId}/envios/envios-panel?tipo=planificados&destino_iata=MIA`
- **THEN** el sistema retorna maletas planificadas de la sesión con destino_iata = MIA

#### Scenario: Filtrar por código de maleta en sesión
- **WHEN** se invoca `GET /api/sesiones/{id}/envios/envios-panel?tipo=en_vuelo&codigo_equipaje=MAL-001`
- **THEN** el sistema retorna solo maletas de la sesión cuyo `id_externo` contiene "MAL-001"

### Requirement: Componente frontend PanelEnviosMaletas
El sistema SHALL proveer un componente React `PanelEnviosMaletas` que muestre tres tabs (Planificados, En Vuelo, Entregados) con filtros de origen, destino y código de maleta, polling automático cuando la sesión está activa, y botones de seguimiento en mapa en la lengüeta "En Vuelo".

#### Scenario: El panel se renderiza con tres tabs y filtros
- **WHEN** el componente se monta
- **THEN** se muestran tres botones de tab (Planificados, En Vuelo, Entregados), dos selects de filtro (Origen, Destino) y un input de texto (Código maleta)

#### Scenario: El panel carga datos al cambiar de tab
- **WHEN** el usuario hace clic en el tab "En Vuelo"
- **THEN** el componente invoca la API correspondiente con `tipo=en_vuelo` y los filtros activos, y muestra la lista de resultados

#### Scenario: El panel filtra por código de maleta
- **WHEN** el usuario escribe un código en el input "Código maleta"
- **THEN** el componente reinvoca la API con el filtro `codigo_equipaje` incluido

#### Scenario: El panel filtra por origen y destino
- **WHEN** el usuario selecciona un origen en el filtro "Origen"
- **THEN** el componente reinvoca la API con el filtro de origen incluido

#### Scenario: Se muestran botones de seguimiento en tab "En Vuelo"
- **WHEN** el tab activo es "En Vuelo" y el callback `onSeguirEnMapa` está definido
- **THEN** cada fila muestra un botón MapPin (Seguir en mapa) y un botón Route (Mostrar ruta)

#### Scenario: No se muestran botones de seguimiento en otros tabs
- **WHEN** el tab activo es "Planificados" o "Entregados"
- **THEN** no se muestran botones de seguimiento aunque los callbacks estén definidos

#### Scenario: Botón Seguir en mapa llama a fetchPlanViaje y sigue el vuelo
- **WHEN** el usuario hace clic en MapPin en una fila de "En Vuelo"
- **THEN** se invoca `fetchPlanViaje(item.equipaje_id)`, y si `ubicacion_actual.tipo === 'VUELO'`, se ejecuta `onSeguirEnMapa(ubicacion_actual.referencia_id)`

#### Scenario: Botón Mostrar ruta llama a fetchPlanViaje y dibuja la ruta
- **WHEN** el usuario hace clic en Route en una fila de "En Vuelo"
- **THEN** se invoca `fetchPlanViaje(item.equipaje_id)`, y si hay `segmentos`, se ejecuta `onMostrarRuta(segmentos)`

#### Scenario: El panel se integra en OperacionView
- **WHEN** la vista OperacionView se renderiza
- **THEN** el componente PanelEnviosMaletas aparece en el sidebar con los callbacks de seguimiento cableados

#### Scenario: El panel se integra en SimulacionView
- **WHEN** la vista SimulacionView se renderiza con una sesión activa
- **THEN** el componente PanelEnviosMaletas aparece en el sidebar, usando las APIs scoped a sesión
