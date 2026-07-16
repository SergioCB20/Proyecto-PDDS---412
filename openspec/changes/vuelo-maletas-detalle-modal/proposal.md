## Why

Actualmente, al abrir el modal de envíos de un vuelo, las maletas individuales solo se pueden ver expandiendo equipaje por equipaje (varios clics). No existe una vista agregada que muestre todas las maletas del vuelo de forma plana y directa, lo que dificulta la inspección rápida de la carga transportada.

## What Changes

- Agregar una sección "Todas las maletas del vuelo" en el `ModalEnvios` cuando se abre para un vuelo (`tipo === 'vuelo'`), usando el endpoint existente `GET /api/vuelos/{id}/maletas`
- Mostrar lista plana con todas las maletas del vuelo: código de maleta, equipaje asociado, badge virtual/física, botón copiar
- No requiere cambios en backend ni en otros componentes

## Capabilities

### New Capabilities
- `vuelo-maletas-lista-plana`: Vista plana de todas las maletas individuales de un vuelo dentro del modal de envíos

### Modified Capabilities

*(Ninguno — solo se agrega UI nueva, no cambian requisitos existentes)*

## Impact

- **Frontend**: Solo `frontend/components/shared/ModalEnvios.tsx` — agregar import de `fetchMaletasVuelo`, nuevo estado, useEffect para llamada API, y renderizado de la sección
- **Backend**: Sin cambios
- **API**: Usa `GET /api/vuelos/{id}/maletas` y `fetchMaletasVuelo()` ya existentes
