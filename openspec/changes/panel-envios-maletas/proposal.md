## Why

Los módulos de simulación y operación actualmente muestran envíos de maletas fragmentados en paneles separados (envíos por vuelo/nodo, entregados recientes), sin una vista unificada que permita responder rápidamente preguntas operativas clave: qué maletas están planificadas para enviarse, cuáles están en vuelo, y cuáles fueron entregadas recientemente, con capacidad de filtrar por origen y destino.

## What Changes

- Nuevo endpoint `GET /api/equipajes/envios-panel` para consultar maletas agrupadas por tipo (planificados, en vuelo, entregados) con filtros opcionales por origen y destino (operación).
- Nuevo endpoint `GET /api/sesiones/{id}/envios/envios-panel` equivalente pero scoped a una sesión de simulación.
- Nuevo componente frontend `PanelEnviosMaletas` con 3 tabs (Planificados, En Vuelo, Entregados) y filtros por origen/destino.
- Integración del panel en las vistas `OperacionView`, `SimulacionView` y `ColapsoView`.

## Capabilities

### New Capabilities
- `envios-panel`: Vista unificada de envíos de maletas con filtros por origen, destino y estado (planificados/en vuelo/entregados).

### Modified Capabilities
- *(ninguna — solo se agregan nuevos endpoints y componentes, no se modifican requisitos existentes)*

## Impact

- **Backend**: Se agregan 2 nuevos endpoints REST y lógica de consulta en `EquipajeService` y `SesionService`. No se modifican endpoints existentes.
- **Frontend**: Se agrega 1 nuevo componente compartido y 2 nuevas funciones API. No se modifican componentes existentes.
- **Base de datos**: No se requieren migraciones nuevas.
