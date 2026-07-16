## ADDED Requirements

### Requirement: Botones Seguir y Ruta en maletas individuales de ModalEnvios

El sistema SHALL mostrar botones Seguir (MapPin) y Ruta (Route) en cada maleta individual dentro del `ModalEnvios`, tanto en la lista expandida por equipaje como en la lista plana "Todas las maletas del vuelo".

#### Scenario: Botones en lista expandida por equipaje
- **WHEN** un equipaje está expandido mostrando sus maletas
- **THEN** cada maleta SHALL mostrar botones Seguir y Ruta

#### Scenario: Botones en lista plana "Todas las maletas del vuelo"
- **WHEN** se renderiza la lista plana de maletas del vuelo
- **THEN** cada maleta SHALL mostrar botones Seguir y Ruta

#### Scenario: Seguir usa equipaje_id de la maleta
- **WHEN** el usuario hace clic en "Seguir" en una maleta individual
- **THEN** SHALL llamar `fetchPlanViaje(m.equipaje_id)` con el UUID del equipaje padre
- **AND** si `ubicacion_actual.tipo === 'VUELO'`, SHALL centrar el mapa en ese vuelo

#### Scenario: Ruta usa equipaje_id de la maleta
- **WHEN** el usuario hace clic en "Ruta" en una maleta individual
- **THEN** SHALL llamar `fetchPlanViaje(m.equipaje_id)` con el UUID del equipaje padre
- **AND** si hay segmentos, SHALL dibujar la ruta en el mapa

### Requirement: Botones Seguir y Ruta en maletas individuales de DetalleEnviosAeropuerto

El sistema SHALL mostrar botones Seguir y Ruta en cada maleta individual dentro de `DetalleEnviosAeropuerto` cuando se expande un equipaje.

#### Scenario: Botones en lista expandida
- **WHEN** un equipaje está expandido en DetalleEnviosAeropuerto
- **THEN** cada maleta SHALL mostrar botones Seguir y Ruta

### Requirement: Expansión de filas en PanelEnviosMaletas

El sistema SHALL permitir expandir cada fila de equipaje en `PanelEnviosMaletas` para ver sus maletas individuales con botones Seguir y Ruta.

#### Scenario: Chevron de expansión
- **WHEN** se renderiza una fila de equipaje en PanelEnviosMaletas
- **THEN** SHALL mostrar un chevron (ChevronDown/ChevronRight) para expandir/colapsar

#### Scenario: Carga lazy de maletas
- **WHEN** el usuario hace clic en el chevron de expansión
- **THEN** SHALL llamar `fetchMaletasEquipaje(item.codigo_equipaje)` para cargar maletas
- **AND** SHALL mostrar spinner durante la carga

#### Scenario: Maletas con botones Seguir y Ruta
- **WHEN** la expansión muestra las maletas
- **THEN** cada maleta SHALL mostrar botones Seguir y Ruta
- **AND** SHALL mostrar el badge "virtual"/"física"

### Requirement: Misma paleta visual

Los botones en maletas individuales SHALL usar los mismos estilos que los botones existentes a nivel equipaje.

#### Scenario: Estilos consistentes
- **WHEN** se renderizan los botones Seguir y Ruta en maletas
- **THEN** SHALL usar los mismos iconos (MapPin, Route), tamaños y colores que los botones de equipaje
