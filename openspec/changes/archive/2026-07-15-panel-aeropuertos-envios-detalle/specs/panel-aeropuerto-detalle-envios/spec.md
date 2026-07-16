## ADDED Requirements

### Requirement: Panel dividido con tabla de aeropuertos y detalle de envíos

El panel de aeropuertos en modo operación SHALL mostrar una tabla de aeropuertos en la sección superior y, al seleccionar un aeropuerto, un panel de detalle con los envíos clasificados en la sección inferior.

#### Scenario: Tabla muestra conteos de envíos por aeropuerto
- **WHEN** el panel de aeropuertos se renderiza
- **THEN** la tabla SHALL incluir columnas "🡑 Sale" y "🡓 Llega" con la cantidad de envíos saliendo y llegando respectivamente
- **AND** si el conteo aún no se ha cargado, SHALL mostrar "—"

#### Scenario: Seleccionar aeropuerto muestra detalle inline
- **WHEN** el usuario hace clic en una fila de aeropuerto en la tabla
- **THEN** el sistema SHALL mostrar un panel de detalle debajo de la tabla
- **AND** SHALL cargar los datos del endpoint `GET /api/nodos/{iata}/envios`
- **AND** si ya hay un aeropuerto seleccionado, SHALL reemplazar el detalle con el nuevo

#### Scenario: Deseleccionar aeropuerto oculta detalle
- **WHEN** el usuario hace clic en el aeropuerto ya seleccionado
- **THEN** el sistema SHALL ocultar el panel de detalle

### Requirement: Panel de detalle muestra envíos clasificados

El panel de detalle SHALL mostrar dos secciones claramente diferenciadas: "Saliendo" y "Llegando", cada una con su lista de envíos.

#### Scenario: Sección Saliendo
- **WHEN** se muestran los envíos saliendo de un aeropuerto
- **THEN** la sección SHALL mostrar un encabezado con "🔴 Saliendo (X envíos · Y maletas)"
- **AND** cada envío SHALL mostrar: código equipaje, destino IATA, cantidad maletas, código vuelo, estado
- **AND** cada envío SHALL ser expandible para ver maletas individuales

#### Scenario: Sección Llegando
- **WHEN** se muestran los envíos llegando a un aeropuerto
- **THEN** la sección SHALL mostrar un encabezado con "🟢 Llegando (X envíos · Y maletas)"
- **AND** cada envío SHALL mostrar: código equipaje, origen IATA, cantidad maletas, código vuelo, estado
- **AND** cada envío SHALL ser expandible para ver maletas individuales

### Requirement: Acciones por envío en el detalle

Cada envío en el detalle SHALL tener botones de acción para seguir en mapa, mostrar ruta y descargar PDF.

#### Scenario: Botón Seguir en mapa
- **WHEN** el usuario hace clic en "Seguir" en un envío
- **THEN** el sistema SHALL obtener el plan de viaje del envío
- **AND** si la ubicación actual es un vuelo, SHALL centrar el mapa en ese vuelo

#### Scenario: Botón Mostrar ruta
- **WHEN** el usuario hace clic en "Ruta" en un envío
- **THEN** el sistema SHALL obtener los segmentos del plan de viaje
- **AND** SHALL dibujar la ruta en el mapa

#### Scenario: Botón Descargar PDF
- **WHEN** el usuario hace clic en "PDF" en un envío
- **THEN** el sistema SHALL descargar el plan de viaje del envío como PDF

### Requirement: Mantener funcionalidad de "Ver en mapa" en tabla

La columna de acción "Ver en mapa" en la tabla de aeropuertos SHALL permanecer funcional y centrar el mapa en el aeropuerto seleccionado.

#### Scenario: Ver en mapa desde la tabla
- **WHEN** el usuario hace clic en el icono de mapa en una fila de aeropuerto
- **THEN** el sistema SHALL centrar el mapa en las coordenadas de ese aeropuerto
- **AND** NO SHALL seleccionar el aeropuerto para el detalle de envíos
