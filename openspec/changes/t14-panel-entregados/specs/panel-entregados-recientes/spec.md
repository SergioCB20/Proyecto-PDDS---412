## ADDED Requirements

### Requirement: Visualizar equipajes entregados recientes
El sistema SHALL mostrar una lista de equipajes con estado `ENTREGADO` dentro de las últimas 4 horas virtuales de la simulación, obtenidos del endpoint `GET /api/sesiones/{id}/envios/entregados-recientes?horas=4`.

#### Scenario: Carga inicial exitosa
- **WHEN** el componente se monta con una sesión activa
- **THEN** el sistema realiza un GET al endpoint con el `sesionId` y `horas=4`
- **THEN** el sistema renderiza la lista de entregados mostrando `origen_iata → destino_iata`, `codigo_vuelo` y `cantidad`

#### Scenario: Sesión sin entregas recientes
- **WHEN** el endpoint retorna una lista vacía
- **THEN** el sistema muestra el mensaje "Sin entregas recientes"

#### Scenario: Error en la carga
- **WHEN** el endpoint retorna un error HTTP
- **THEN** el sistema muestra un banner de error con mensaje descriptivo

#### Scenario: Polling automático en sesión activa
- **WHEN** la sesión está en estado `EN_CURSO`
- **THEN** el sistema actualiza la lista cada 5 segundos automáticamente

#### Scenario: Polling se detiene al finalizar
- **WHEN** la sesión cambia a estado `FINALIZADA` o `COLAPSADA`
- **THEN** el sistema detiene el polling

### Requirement: Type EnvioEntregadoResponse
El sistema SHALL definir un tipo `EnvioEntregadoResponse` en `frontend/lib/types.ts` con los campos `origen_iata`, `destino_iata`, `codigo_vuelo`, `cantidad` para tipar la respuesta del endpoint.

#### Scenario: Type coincide con respuesta del backend
- **WHEN** el frontend recibe una respuesta del endpoint B4
- **THEN** el sistema parsea correctamente los campos `origen_iata`, `destino_iata`, `codigo_vuelo`, `cantidad`

### Requirement: Componente PanelEntregados
El sistema SHALL proveer un componente `PanelEntregados` en `frontend/components/simulacion/PanelEntregados.tsx` que consuma el endpoint y renderice la lista.

#### Scenario: Renderizado en sidebar
- **WHEN** el componente se renderiza en la página `simulacion/[id]/page.tsx`
- **THEN** se muestra como una sección más en la barra lateral derecha, debajo de los controles de vuelos

#### Scenario: Props del componente
- **WHEN** el componente se instancia
- **THEN** recibe como prop `sesionId: string`
- **THEN** usa el valor de `sesionId` para construir la URL del endpoint
