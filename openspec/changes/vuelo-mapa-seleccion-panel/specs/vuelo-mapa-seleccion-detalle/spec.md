## ADDED Requirements

### Requirement: Vuelo seleccionado desde el mapa abre modal de detalle

Cuando el usuario hace clic en un marcador de vuelo (EN_RUTA o PROGRAMADO) en el mapa, el sistema DEBE seleccionar el vuelo en el panel de vuelos y abrir el modal `ModalEnvios` con la información del vuelo y sus envíos.

#### Scenario: Clic en vuelo EN_RUTA en el mapa abre modal
- **WHEN** el usuario hace clic en un avión animado (EN_RUTA) en el mapa
- **THEN** el mapa enfoca la cámara en el vuelo (`onSeguirVuelo`)
- **THEN** el panel cambia a pestaña "Vuelos"
- **THEN** la fila del vuelo se resalta y se hace scroll
- **THEN** se abre `ModalEnvios` con `{ tipo: "vuelo", id, codigo }` del vuelo clickeado

#### Scenario: Clic en vuelo PROGRAMADO en el mapa abre modal
- **WHEN** el usuario hace clic en un vuelo PROGRAMADO en el mapa
- **THEN** se abre `ModalEnvios` con la información del vuelo

#### Scenario: Callback propaga codigo_vuelo correctamente
- **WHEN** el usuario hace clic en un vuelo en el mapa
- **THEN** el callback `onVueloSeleccionado` recibe dos argumentos: `(id: string, codigo: string)`
- **THEN** `codigo` corresponde al `codigo_vuelo` del vuelo clickeado

### Requirement: Vista OperacionView abre modal desde mapa

La vista principal de operación DEBE abrir el modal al recibir el evento del mapa.

#### Scenario: OperacionView reacciona al clic en mapa
- **WHEN** `handleVueloSeleccionadoOp` es llamado con `(id, codigo)`
- **THEN** se ejecuta `setVueloSeleccionadoOp(id)`
- **THEN** se ejecuta `setSelectedEnvio({ tipo: "vuelo", id, codigo })`

### Requirement: Vista SimulacionView abre modal desde mapa

La vista de simulación DEBE abrir el modal al recibir el evento del mapa.

#### Scenario: SimulacionView reacciona al clic en mapa
- **WHEN** `handleVueloSeleccionadoSim` es llamado con `(id, codigo)`
- **THEN** se ejecuta `setVueloSeleccionadoSim(id)`
- **THEN** se ejecuta `setSelectedEnvio({ tipo: "vuelo", id, codigo })`

### Requirement: Vista ColapsoView abre modal desde mapa

La vista de colapso DEBE abrir el modal al recibir el evento del mapa.

#### Scenario: ColapsoView reacciona al clic en mapa
- **WHEN** `handleVueloSeleccionadoCol` es llamado con `(id, codigo)`
- **THEN** se ejecuta `setVueloSeleccionadoCol(id)`
- **THEN** se ejecuta `setSelectedEnvio({ tipo: "vuelo", id, codigo })`
