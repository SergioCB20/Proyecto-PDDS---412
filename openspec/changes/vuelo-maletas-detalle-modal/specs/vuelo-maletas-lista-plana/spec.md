## ADDED Requirements

### Requirement: Vista plana de todas las maletas del vuelo en el modal

El sistema SHALL mostrar una sección "Todas las maletas del vuelo" en el `ModalEnvios` cuando se abre para un vuelo (`tipo === 'vuelo'`), que liste todas las maletas del vuelo en una tabla plana sin necesidad de expandir equipaje por equipaje.

#### Scenario: Sección visible solo para vuelo
- **WHEN** el modal se abre con `tipo === 'vuelo'`
- **THEN** SHALL mostrar la sección "Todas las maletas del vuelo" al final del contenido del modal

#### Scenario: Sección oculta para nodo
- **WHEN** el modal se abre con `tipo === 'nodo'`
- **THEN** SHALL NO mostrar la sección de maletas del vuelo

### Requirement: Carga de datos mediante fetchMaletasVuelo

El sistema SHALL cargar la lista plana de maletas usando la función existente `fetchMaletasVuelo(vueloId)` que llama a `GET /api/vuelos/{id}/maletas`, en un `useEffect` separado del que carga los equipajes.

#### Scenario: Carga exitosa
- **WHEN** el modal se abre para un vuelo y `fetchMaletasVuelo` retorna datos
- **THEN** SHALL mostrar la lista completa de maletas

#### Scenario: Estado de carga
- **WHEN** los datos se están cargando
- **THEN** SHALL mostrar un spinner con texto "Cargando maletas del vuelo..."

#### Scenario: Estado vacío
- **WHEN** `fetchMaletasVuelo` retorna un array vacío
- **THEN** SHALL mostrar "Este vuelo no tiene maletas registradas"

#### Scenario: Error en carga
- **WHEN** `fetchMaletasVuelo` lanza un error
- **THEN** SHALL mostrar el mensaje de error en un contenedor rojo

### Requirement: Columnas de la tabla plana

La tabla plana SHALL mostrar cada maleta con las siguientes columnas: código de maleta, equipaje asociado, badge de tipo (virtual/física), y botón copiar.

#### Scenario: Columna código de maleta
- **WHEN** se renderiza cada maleta
- **THEN** SHALL mostrar `codigo_maleta` en fuente monospace

#### Scenario: Columna equipaje asociado
- **WHEN** se renderiza cada maleta
- **THEN** SHALL mostrar `equipaje_id_externo` del equipaje al que pertenece

#### Scenario: Badge de tipo
- **WHEN** la maleta tiene `virtual = true`
- **THEN** SHALL mostrar un badge "virtual" con estilo ambar
- **WHEN** la maleta tiene `virtual = false` o no tiene el campo
- **THEN** SHALL mostrar un badge "física" con estilo azul

#### Scenario: Botón copiar
- **WHEN** el usuario hace clic en el botón copiar de una maleta
- **THEN** SHALL copiar `codigo_maleta` al portapapeles
- **AND** SHALL mostrar temporalmente un ícono Check durante 1.5s

### Requirement: Consistencia visual

La sección SHALL mantener la misma paleta visual que el resto del modal (mismos colores, bordes, tipografía, espaciado).

#### Scenario: Estilos consistentes
- **WHEN** se renderiza la sección
- **THEN** SHALL usar los mismos estilos de borde, fondo y tipografía que la lista de maletas expandible existente
