## Why

Actualmente la interfaz usa el término "Nodo" para referirse a los aeropuertos en los módulos de Operación y Simulación. Para un usuario del sistema, "Aeropuerto" es más intuitivo y refleja mejor la realidad logística. Este cambio renombra toda la terminología visible y las entidades internas del frontend sin alterar el backend.

## What Changes

- Renombrar todos los textos visibles al usuario: "Nodo" → "Aeropuerto", "Nodos" → "Aeropuertos" en labels, headers, placeholders, mensajes de error, tooltips y leyendas del mapa.
- Renombrar tipos, interfaces, variables y funciones del frontend: `Nodo` → `Aeropuerto`, `NodoEnMapa` → `AeropuertoEnMapa`, `NodoTelemetria` → `AeropuertoTelemetria`, etc.
- Renombrar componentes: `PanelNodosOperacion` → `PanelAeropuertosOperacion`, `PanelNodos` → `PanelAeropuertos`, `GeoMapaNodo` → `GeoMapaAeropuerto`.
- Renombrar archivos físicos: `GeoMapaNodo.tsx` → `GeoMapaAeropuerto.tsx`, `PanelNodosOperacion.tsx` → `PanelAeropuertosOperacion.tsx`, `PanelNodos.tsx` → `PanelAeropuertos.tsx`.
- Los contratos con el backend (JSON keys, URLs de API, headers HTTP, enums) NO se modifican para evitar riesgos.

## Capabilities

### New Capabilities
- `rename-nodo-ui-textos`: Renombrar textos visibles al usuario (Nivel 1)
- `rename-nodo-tipos-vars`: Renombrar tipos, variables y funciones del frontend (Nivel 2)
- `rename-nodo-componentes`: Renombrar y mover archivos de componentes

### Modified Capabilities
<!-- No existing specs are modified since this only changes frontend presentation and naming -->

## Impact

- **Frontend**: 16 archivos modificados, 3 archivos renombrados físicamente
- **Backend**: Sin cambios
- **Base de datos**: Sin cambios
- **APIs**: Sin cambios (contratos JSON, URLs y headers se mantienen)
- **Riesgo**: Bajo-medio. Los cambios son puramente de nomenclatura en el frontend. Las propiedades de los objetos JSON que vienen del backend mantienen sus nombres originales.
