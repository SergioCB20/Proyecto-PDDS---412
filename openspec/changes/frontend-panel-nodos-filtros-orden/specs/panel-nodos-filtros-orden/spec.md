## ADDED Requirements

### Requirement: Filtrar nodos por código IATA y continente

El componente `PanelNodos` SHALL incluir un input de texto para filtrar por `codigo_iata` (case-insensitive) y un `<Select>` para filtrar por `continente`. Las opciones del select SHALL poblarse dinámicamente desde los datos disponibles. Si `continente` es string vacío para algún nodo, se usará `zona_horaria` como proxy.

#### Scenario: Filtrar por código IATA
- **WHEN** el usuario escribe "LIM" en el input de código
- **THEN** solo se muestran nodos cuyo `codigo_iata` contenga "LIM"

#### Scenario: Filtrar por continente
- **WHEN** el usuario selecciona "South America" en el select de continente
- **THEN** solo se muestran nodos cuyo `continente` sea "South America"

#### Scenario: Limpiar filtros
- **WHEN** el usuario hace clic en "Limpiar filtros"
- **THEN** todos los filtros se resetean y se muestran todos los nodos

### Requirement: Ordenar nodos por criterio seleccionable

El `PanelNodos` SHALL incluir un `<Select>` que permita ordenar por ocupación ascendente/descendente, hora de salida UT más temprana, hora de llegada UT más temprana, o código IATA (A-Z). La hora de salida/llegada UT SHALL derivarse de los `VueloTelemetria` agrupando por `origen_iata`/`destino_iata`.

#### Scenario: Ordenar por ocupación ascendente
- **WHEN** el usuario selecciona "Ocupación ↑"
- **THEN** los nodos se ordenan de menor a mayor `ocupacion_pct`

#### Scenario: Ordenar por hora de salida UT
- **WHEN** el usuario selecciona "Salida UT"
- **THEN** los nodos se ordenan por el vuelo más temprano que sale desde cada nodo

#### Scenario: Sin orden
- **WHEN** el usuario selecciona "Sin orden"
- **THEN** los nodos mantienen el orden original de la telemetría
