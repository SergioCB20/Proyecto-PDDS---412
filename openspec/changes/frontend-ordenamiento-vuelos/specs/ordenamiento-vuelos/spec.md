## ADDED Requirements

### Requirement: Ordenar vuelos por criterio seleccionable

El `PanelVuelos` SHALL incluir un control de tipo `<Select>` que permita al usuario ordenar la lista de vuelos por los siguientes criterios: ocupación ascendente, ocupación descendente, hora de salida, hora de llegada, origen (A-Z), destino (A-Z). El ordenamiento SHALL aplicar sobre la lista ya filtrada. El valor por defecto SHALL ser "Sin orden" (sin ordenamiento adicional).

#### Scenario: Ordenar por ocupación ascendente
- **WHEN** el usuario selecciona "Ocupación ↑" en el dropdown de ordenamiento
- **THEN** la lista se ordena de menor a mayor según `capacidad_carga - carga_disponible`

#### Scenario: Ordenar por ocupación descendente
- **WHEN** el usuario selecciona "Ocupación ↓"
- **THEN** la lista se ordena de mayor a menor según `capacidad_carga - carga_disponible`

#### Scenario: Ordenar por hora de salida
- **WHEN** el usuario selecciona "Hora salida"
- **THEN** la lista se ordena cronológicamente por `hora_salida`

#### Scenario: Ordenar por hora de llegada
- **WHEN** el usuario selecciona "Hora llegada"
- **THEN** la lista se ordena cronológicamente por `hora_llegada`

#### Scenario: Ordenar por origen (A-Z)
- **WHEN** el usuario selecciona "Origen (A-Z)"
- **THEN** la lista se ordena alfabéticamente por `origen_iata`

#### Scenario: Ordenar por destino (A-Z)
- **WHEN** el usuario selecciona "Destino (A-Z)"
- **THEN** la lista se ordena alfabéticamente por `destino_iata`

#### Scenario: Sin orden
- **WHEN** el usuario selecciona "Sin orden" o el valor por defecto
- **THEN** la lista mantiene el orden original de la telemetría
