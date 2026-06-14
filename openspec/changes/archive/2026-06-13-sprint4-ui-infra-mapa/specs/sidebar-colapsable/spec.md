## ADDED Requirements

### Requirement: Sidebar colapsable en vista de simulación
El panel derecho de la vista `/simulacion/[id]` SHALL ser colapsable mediante un botón de toggle. En estado expandido SHALL mostrar el contenido completo (métricas, resúmenes, controles). En estado colapsado SHALL mostrar solo una pestaña angosta con indicadores mínimos (estado de sesión y telemetría).

#### Scenario: Toggle sidebar de expandido a colapsado
- **WHEN** el usuario hace clic en el botón de toggle (ícono menú/chevron) mientras el sidebar está expandido
- **THEN** el sidebar SHALL colapsar a un ancho angosto (~48px)
- **THEN** el contenido principal del mapa SHALL ocupar el espacio liberado

#### Scenario: Toggle sidebar de colapsado a expandido
- **WHEN** el usuario hace clic en el botón de toggle mientras el sidebar está colapsado
- **THEN** el sidebar SHALL expandirse a su ancho completo (320px / w-80)
- **THEN** el contenido completo del sidebar SHALL ser visible nuevamente

#### Scenario: Indicadores mínimos visibles en estado colapsado
- **WHEN** el sidebar está colapsado
- **THEN** SHALL mostrar el badge de estado de sesión y el indicador de conectividad de telemetría
- **THEN** NO SHALL mostrar las cards de métricas, resúmenes, ni controles

#### Scenario: Animación suave en transición
- **WHEN** el sidebar cambia entre expandido y colapsado
- **THEN** la transición SHALL tener una animación suave usando `transition-all duration-300`
