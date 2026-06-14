## Context

La simulación muestra nodos en el panel lateral con una lista inline sin interactividad (líneas 501-528 de page.tsx). El componente `PanelVuelos` ya sentó el precedente de componente extraíble con filtros y ordenamiento. `PanelNodos` seguirá el mismo patrón.

## Goals / Non-Goals

**Goals:**
- Crear `PanelNodos` con filtros y ordenamiento reutilizable
- Agregar `continente` y `zona_horaria` a la telemetría de nodos
- Reemplazar el inline actual en page.tsx

**Non-Goals:**
- No modificar API REST
- No agregar datos de temporización en backend para nodos (se deriva de vuelos)

## Decisions

### 1. Timing de nodos derivado desde vuelos
Para ordenar por "hora de salida UT" y "hora de llegada UT", se agrupan `VueloTelemetria` por `origen_iata`/`destino_iata` y se obtiene el vuelo más temprano. Esto evita cambios en backend y reusa los datos ya disponibles.

### 2. Contienente como campo del backend
`NodoLogistico` ya tiene el campo `continente`. Se agrega al JSON de telemetría. Si es null, se envía string vacío.

### 3. Mismo patrón que PanelVuelos
Misma estructura: inputs de filtro arriba, select de orden en medio, lista abajo. Mismos componentes UI (`Input`, `Select`). Mismo estilo visual.
