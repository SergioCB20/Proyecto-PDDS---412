## ADDED Requirements

### Requirement: Componentes React renombrados
Los componentes React que contienen "Nodo" en su nombre DEBEN ser renombrados a "Aeropuerto" y sus archivos físicos renombrados.

#### Scenario: Componente GeoMapaNodo renombrado
- **WHEN** se importa el componente de marcador de aeropuerto en el mapa
- **THEN** el componente se llama `GeoMapaAeropuerto` en vez de `GeoMapaNodo`
- **AND** el archivo físico se llama `GeoMapaAeropuerto.tsx` en vez de `GeoMapaNodo.tsx`
- **AND** su prop `nodo: NodoEnMapa` ahora es `aeropuerto: AeropuertoEnMapa`

#### Scenario: Componente PanelNodosOperacion renombrado
- **WHEN** se importa el panel de aeropuertos en la vista de Operación
- **THEN** el componente se llama `PanelAeropuertosOperacion` en vez de `PanelNodosOperacion`
- **AND** el archivo físico se llama `PanelAeropuertosOperacion.tsx` en vez de `PanelNodosOperacion.tsx`
- **AND** su prop `nodos: NodoTelemetria[]` ahora es `aeropuertos: AeropuertoTelemetria[]`
- **AND** su callback `onNodoClick` ahora es `onAeropuertoClick`

#### Scenario: Componente PanelNodos (simulación) renombrado
- **WHEN** se importa el panel de aeropuertos en la vista de Simulación
- **THEN** el componente se llama `PanelAeropuertos` en vez de `PanelNodos`
- **AND** el archivo físico se llama `PanelAeropuertos.tsx` en vez de `PanelNodos.tsx`
- **AND** su prop `nodos: NodoTelemetria[]` ahora es `aeropuertos: AeropuertoTelemetria[]`
- **AND** su callback `onNodoClick` ahora es `onAeropuertoClick`

### Requirement: Variables internas de componentes renombradas
Las variables internas de los componentes renombrados DEBEN actualizar su nomenclatura.

#### Scenario: Variables en PanelAeropuertosOperacion y PanelAeropuertos
- **WHEN** el componente procesa datos de aeropuertos
- **THEN** las variables internas se llaman `aeropuertos`, `aeropuertosFiltrados`, `aeropuertosOrdenados`, `timingPorAeropuerto` en vez de `nodos`, `nodosFiltrados`, etc.
- **AND** las variables de filtro `filtroCodigo` y `filtroContinente` se mantienen igual

#### Scenario: Variable en ResumenVuelosOperacion
- **WHEN** se agrupan vuelos por aeropuerto
- **THEN** la variable se llama `porAeropuerto` en vez de `porNodo`
