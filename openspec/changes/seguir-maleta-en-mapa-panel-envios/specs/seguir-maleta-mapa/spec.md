## ADDED Requirements

### Requirement: Botón "Seguir en mapa" por fila de envío
Cada fila de envío en los paneles `PanelEnviosOperacion` y `PanelEnvios` SHALL mostrar un botón con icono de mapa que permita localizar el vuelo que transporta esa maleta.

#### Scenario: Botón visible en cada envío
- **WHEN** el panel de envíos muestra una lista de `EnvioItemResponse[]`
- **THEN** cada fila SHALL incluir un botón con icono `MapPin` de lucide-react
- **AND** el botón SHALL tener tooltip "Seguir en mapa"

#### Scenario: Botón no visible si no hay callback
- **WHEN** el panel se renderiza sin la prop `onSeguirEnMapa`
- **THEN** el botón de seguimiento NO SHALL renderizarse

### Requirement: Consulta del plan de viaje al hacer clic
Al pulsar el botón, el sistema SHALL consultar `GET /api/equipajes/{equipajeId}/plan-viaje` para obtener la ubicación actual de la maleta.

#### Scenario: Consulta exitosa — maleta en vuelo
- **WHEN** el usuario pulsa "Seguir en mapa"
- **AND** `GET /api/equipajes/{id}/plan-viaje` retorna `ubicacion_actual.tipo === "VUELO"`
- **THEN** el sistema SHALL llamar `onSeguirEnMapa(ubicacion_actual.referencia_id)` con el UUID del vuelo
- **AND** el mapa SHALL activar seguimiento de ese vuelo (cámara centrada, resalte dorado)

#### Scenario: Consulta exitosa — maleta en nodo
- **WHEN** el usuario pulsa "Seguir en mapa"
- **AND** `ubicacion_actual.tipo === "NODO"` o `ubicacion_actual === null`
- **THEN** el sistema SHALL mostrar una alerta "La maleta no está en un vuelo actualmente"
- **AND** NO SHALL llamar `onSeguirEnMapa`

#### Scenario: Error en la consulta
- **WHEN** la consulta a `GET /api/equipajes/{id}/plan-viaje` falla (error de red, 404, etc.)
- **THEN** el sistema SHALL mostrar una alerta "Error al obtener información de la maleta"

### Requirement: Feedback visual durante la carga
Mientras se realiza la consulta, el botón SHALL mostrar un spinner/indicador de carga para proporcionar feedback inmediato al usuario.

#### Scenario: Spinner durante la consulta
- **WHEN** el usuario pulsa "Seguir en mapa"
- **THEN** el botón SHALL deshabilitarse y mostrar un spinner giratorio
- **AND** otros botones de la lista NO SHALL verse afectados
- **AND** al finalizar la consulta (éxito o error) el botón SHALL restaurar su estado normal

### Requirement: Integración con mapa existente
El seguimiento activado SHALL comportarse idénticamente al botón "Ver en mapa" existente en el panel de vuelos.

#### Scenario: Misma experiencia que "Ver en mapa" de vuelos
- **WHEN** se activa `seguidoVueloId` mediante `onSeguirEnMapa`
- **THEN** `MapController` SHALL volar la cámara a la posición del vuelo con zoom 7
- **AND** `AvionAnimado` SHALL mostrar el resalte dorado de seguimiento
- **AND** se SHALL mostrar el banner "Siguiendo elemento — ESC para salir"
- **AND** al pulsar ESC se SHALL salir del seguimiento
