## ADDED Requirements

### Requirement: Panel de vuelos con filtros en vivo

El sistema SHALL proporcionar un panel de listado de vuelos dentro de la vista de simulación en vivo que permita al operador filtrar los vuelos visibles por código, origen IATA y destino IATA. El panel SHALL reemplazar la sección "Ocupación de Vuelos" existente y funcionar exclusivamente con datos de telemetría WebSocket.

#### Scenario: Filtro por código de vuelo
- **WHEN** el operador escribe texto en el campo de filtro "Código"
- **THEN** la lista se filtra MOSTRANDO únicamente los vuelos cuyo `codigo_vuelo` contenga el texto ingresado (case-insensitive)

#### Scenario: Filtro por origen IATA
- **WHEN** el operador selecciona un valor en el selector de "Origen"
- **THEN** la lista se filtra MOSTRANDO únicamente los vuelos cuyo `origen_iata` coincida exactamente con el valor seleccionado

#### Scenario: Filtro por destino IATA
- **WHEN** el operador selecciona un valor en el selector de "Destino"
- **THEN** la lista se filtra MOSTRANDO únicamente los vuelos cuyo `destino_iata` coincida exactamente con el valor seleccionado

#### Scenario: Filtros combinados
- **WHEN** el operador aplica filtros en código, origen y destino simultáneamente
- **THEN** la lista MUESTRA únicamente los vuelos que cumplen TODOS los filtros activos

#### Scenario: Selectores de origen y destino con valores dinámicos
- **WHEN** el panel se renderiza con datos de telemetría
- **THEN** los selectores de origen y destino DEBEN contener como opciones los valores únicos de `origen_iata` y `destino_iata` presentes en los datos, más una opción "Todas" que limpia el filtro respectivo
- **AND** los selectores DEBEN actualizar sus opciones dinámicamente cuando cambien los datos de telemetría

#### Scenario: Limpiar filtros
- **WHEN** hay al menos un filtro activo
- **THEN** el panel DEBE mostrar un botón "Limpiar filtros" que al hacer clic RESETEA todos los filtros a su valor por defecto

#### Scenario: Conteo de vuelos visibles
- **WHEN** el panel se renderiza con datos
- **THEN** DEBE mostrar un texto indicando "Mostrando X de Y vuelos" donde X es la cantidad de vuelos filtrados e Y es el total

#### Scenario: Listado vacío sin telemetría
- **WHEN** no hay datos de telemetría (`telemetria?.vuelos` está vacío o es undefined)
- **THEN** el panel DEBE mostrar un mensaje "Sin datos de vuelos" o "Esperando telemetría..."

#### Scenario: Diseño consistente
- **WHEN** el panel se renderiza
- **THEN** DEBE usar los mismos estilos visuales (clases Tailwind) que el resto del sidebar: padding `p-4`, border-t, fondos `bg-slate-50`, tipografía `text-xs`/`text-sm`
- **AND** cada vuelo DEBE mostrar su código, ruta (origen→destino), ocupación numérica y barra de progreso visual
