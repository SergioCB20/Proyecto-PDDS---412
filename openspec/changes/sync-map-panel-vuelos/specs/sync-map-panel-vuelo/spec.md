## ADDED Requirements

### Requirement: Mapa sincroniza vuelo clickeado con el panel lateral
El sistema SHALL sincronizar el panel lateral con el vuelo clickeado en el mapa. Al hacer click en un marcador de vuelo (PROGRAMADO o EN_RUTA) en el mapa, el panel deberá cambiar automáticamente a la pestaña "Vuelos", hacer scroll al item correspondiente y resaltarlo visualmente.

#### Scenario: Click en vuelo PROGRAMADO o EN_RUTA sincroniza panel
- **WHEN** el usuario hace click en un marcador de vuelo PROGRAMADO o EN_RUTA en el mapa
- **THEN** el panel lateral cambia a la pestaña "Vuelos"
- **AND** la lista de vuelos hace scroll para mostrar el vuelo clickeado
- **AND** el vuelo clickeado se resalta visualmente con un borde/anillo azul

#### Scenario: Click en vuelo cuando el panel está en otra pestaña
- **WHEN** el usuario está en la pestaña "Aeropuertos" del panel
- **AND** hace click en un vuelo en el mapa
- **THEN** el panel cambia automáticamente a la pestaña "Vuelos"
- **AND** muestra el vuelo clickeado resaltado

#### Scenario: Click en vuelo COMPLETADO o CANCELADO
- **WHEN** el usuario hace click en un vuelo COMPLETADO o CANCELADO en el mapa
- **THEN** el sistema NO realiza ninguna acción de sincronización con el panel (no hay marcador clickeable)
