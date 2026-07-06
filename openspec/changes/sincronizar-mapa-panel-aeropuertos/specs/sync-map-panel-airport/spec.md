## ADDED Requirements

### Requirement: Mapa sincroniza aeropuerto clickeado con el panel lateral
El sistema SHALL sincronizar el panel lateral con el aeropuerto clickeado en el mapa. Al hacer click en un marcador de aeropuerto en el mapa, el panel deberá cambiar automáticamente a la pestaña "Aeropuertos", hacer scroll al item correspondiente y resaltarlo visualmente.

#### Scenario: Click en aeropuerto del mapa sincroniza panel
- **WHEN** el usuario hace click en un marcador de aeropuerto en el mapa
- **THEN** el panel lateral cambia a la pestaña "Aeropuertos"
- **AND** la lista de aeropuertos hace scroll para mostrar el aeropuerto clickeado
- **AND** el aeropuerto clickeado se resalta visualmente con un borde/anillo azul
- **AND** el mapa hace fly-to hacia ese aeropuerto

#### Scenario: Click en aeropuerto cuando el panel está en otra pestaña
- **WHEN** el usuario está en la pestaña "Vuelos" del panel
- **AND** hace click en un aeropuerto en el mapa
- **THEN** el panel cambia automáticamente a la pestaña "Aeropuertos"
- **AND** muestra el aeropuerto clickeado resaltado

#### Scenario: Click en aeropuerto con filtros activos en el panel
- **WHEN** el usuario tiene filtros activos en la lista de aeropuertos (búsqueda, continente, color)
- **AND** hace click en un aeropuerto en el mapa que NO está visible por los filtros
- **THEN** el panel NO cambia los filtros
- **AND** si el aeropuerto no está visible, no se hace scroll (comportamiento actual de la lista filtrada)
