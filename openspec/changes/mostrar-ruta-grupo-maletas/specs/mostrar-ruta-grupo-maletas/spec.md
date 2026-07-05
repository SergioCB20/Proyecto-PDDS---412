## ADDED Requirements

### Requirement: Botón "Mostrar ruta" por fila de envío
Cada fila de envío en los paneles `PanelEnviosOperacion` y `PanelEnvios` SHALL mostrar un botón con icono `Route` de lucide-react para visualizar la ruta completa del grupo de maletas en el mapa.

#### Scenario: Botón visible en cada envío
- **WHEN** el panel de envíos muestra una lista de `EnvioItemResponse[]`
- **THEN** cada fila SHALL incluir un botón con icono `Route`
- **AND** el botón SHALL tener tooltip "Mostrar ruta en el mapa"
- **AND** el botón SHALL deshabilitarse si no se provee la prop `onMostrarRuta`

#### Scenario: Botón no renderizado sin callback
- **WHEN** el panel se renderiza sin la prop `onMostrarRuta`
- **THEN** el botón de ruta NO SHALL renderizarse

### Requirement: Consulta del plan de viaje al hacer clic
Al pulsar el botón, el sistema SHALL consultar `GET /api/equipajes/{equipajeId}/plan-viaje` para obtener los segmentos del plan de viaje.

#### Scenario: Consulta exitosa con segmentos
- **WHEN** el usuario pulsa "Mostrar ruta"
- **AND** `GET /api/equipajes/{id}/plan-viaje` retorna `segmentos[]` con al menos un segmento
- **THEN** el sistema SHALL llamar `onMostrarRuta(segmentos)` con el arreglo de segmentos
- **AND** el mapa SHALL mostrar una polyline con la ruta completa
- **AND** los vuelos correspondientes SHALL resaltarse

#### Scenario: Consulta exitosa sin segmentos
- **WHEN** el usuario pulsa "Mostrar ruta"
- **AND** el plan de viaje retorna `segmentos` vacío
- **THEN** el sistema SHALL mostrar alerta "El grupo de maletas no tiene un plan de viaje asignado"

#### Scenario: Error en la consulta
- **WHEN** la consulta falla (error de red, 404, etc.)
- **THEN** el sistema SHALL mostrar alerta "Error al obtener información de la maleta"

### Requirement: Polyline de ruta en el mapa
El mapa SHALL dibujar una polyline que conecte todos los aeropuertos de la ruta en orden: origen → aeropuertos intermedios → destino final.

#### Scenario: Polyline renderizada correctamente
- **WHEN** se activa `rutaDestacada` en `GeoMapa`
- **THEN** se SHALL renderizar un `<Polyline>` con las coordenadas proporcionadas
- **AND** la polyline SHALL tener color azul `#2563eb`, weight 5, opacidad 0.8
- **AND** el mapa SHALL ejecutar `fitBounds` para mostrar la ruta completa

#### Scenario: Polyline eliminada al limpiar
- **WHEN** `rutaDestacada` se setea a `null`
- **THEN** la polyline SHALL eliminarse del mapa
- **AND** el resalte de vuelos SHALL eliminarse

### Requirement: Resalte de vuelos involucrados
Los vuelos en `rutaDestacada.vueloIds` SHALL renderizarse visualmente destacados en el mapa.

#### Scenario: Vuelo destacado visualmente
- **WHEN** un vuelo tiene `destacado = true`
- **THEN** el trail del vuelo SHALL renderizarse más grueso
- **AND** el vuelo SHALL tener un efecto glow (sombra/brillo)
- **AND** el vuelo SHALL tener z-index superior para aparecer encima

#### Scenario: Vuelo no destacado sin cambios
- **WHEN** un vuelo tiene `destacado = false`
- **THEN** el vuelo SHALL renderizarse con su apariencia normal

### Requirement: Feedback visual durante la carga
Mientras se consulta el plan de viaje, el botón SHALL mostrar un spinner.

#### Scenario: Spinner durante la consulta
- **WHEN** el usuario pulsa "Mostrar ruta"
- **THEN** el botón SHALL deshabilitarse y mostrar `Loader2` con animación `animate-spin`
- **AND** al finalizar la consulta el botón SHALL restaurar su estado normal

### Requirement: Limpieza del resalte
El usuario SHALL poder limpiar el resalte de ruta mediante una acción explícita.

#### Scenario: Limpiar con tecla ESC
- **WHEN** hay una `rutaDestacada` activa
- **AND** el usuario pulsa la tecla ESC
- **THEN** `rutaDestacada` SHALL setearse a `null`
- **AND** la polyline y el resalte SHALL eliminarse

#### Scenario: Banner de ruta activa
- **WHEN** hay una `rutaDestacada` activa
- **THEN** el mapa SHALL mostrar un banner o botón "Cerrar ruta [ESC]"
