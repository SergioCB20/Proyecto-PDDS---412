## ADDED Requirements

### Requirement: Nuevo componente DetalleEnviosAeropuerto

El sistema SHALL incluir un nuevo componente `DetalleEnviosAeropuerto` en `frontend/components/operacion/` que renderice el panel de detalle de envíos para un aeropuerto seleccionado.

#### Scenario: Estructura del componente
- **WHEN** el componente se renderiza con un `iata` válido
- **THEN** SHALL mostrar un contenedor con borde y fondo distintivo
- **AND** SHALL tener un título "✈️ Aeropuerto {iata} — Detalle de Envíos"
- **AND** SHALL mostrar dos subsecciones "Saliendo" y "Llegando" con sus respectivos encabezados y listas
- **AND** SHALL cargar datos del endpoint `GET /api/nodos/{iata}/envios`

#### Scenario: Estado de carga
- **WHEN** los datos se están cargando
- **THEN** SHALL mostrar un spinner y "Cargando envíos..."

#### Scenario: Estado vacío
- **WHEN** no hay envíos saliendo ni llegando
- **THEN** SHALL mostrar "Sin envíos registrados en este aeropuerto"

#### Scenario: Props del componente
- **WHEN** se instancia `DetalleEnviosAeropuerto`
- **THEN** SHALL aceptar las props: `iata: string`, `onSeguirEnMapa?: (vueloId: string) => void`, `onMostrarRuta?: (segmentos: SegmentoResponse[]) => void`

### Requirement: Nuevos tipos en types.ts

El sistema SHALL incluir nuevas interfaces TypeScript para soportar el endpoint y el componente de detalle.

#### Scenario: Interfaces requeridas
- **WHEN** se definen los tipos del frontend
- **THEN** SHALL incluir `EnvioNodoDetalle`, `ConteoNodo`, y `NodoEnviosResponse` según la estructura del endpoint `GET /api/nodos/{iata}/envios`

### Requirement: Nueva función en api.ts

El sistema SHALL incluir una nueva función `fetchEnviosNodoConClasificacion` en el cliente API.

#### Scenario: Llamada API
- **WHEN** se invoca `fetchEnviosNodoConClasificacion("LIM")`
- **THEN** SHALL hacer `GET /api/nodos/LIM/envios`
- **AND** SHALL retornar un `NodoEnviosResponse`
