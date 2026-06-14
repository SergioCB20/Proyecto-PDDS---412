## Why

El panel lateral de simulación muestra nodos en una lista inline sin filtros ni ordenamiento. El analista necesita poder filtrar nodos por código IATA y continente, y ordenarlos por ocupación u horarios de vuelos asociados, para analizar rápidamente la capacidad operativa.

## What Changes

- **T11:** Agregar filtros de código IATA y continente al panel de nodos
- **T12:** Agregar ordenamiento por ocupación, hora de salida UT y hora de llegada UT

## Capabilities

### New Capabilities
- `panel-nodos-filtros-orden`: Panel de nodos con filtros (código, continente) y ordenamiento (ocupación, salida UT, llegada UT)

### Modified Capabilities
- `sse-frontend-consumo`: Se agregan campos `continente` y `zona_horaria` al payload de telemetría de nodos

## Impact

- **Backend:** `TelemetriaService.java` — +2 campos en JSON de nodos
- **Frontend:** `types.ts` — +2 campos en `NodoTelemetria`; nuevo componente `PanelNodos.tsx`; `page.tsx` — reemplazar inline por `PanelNodos`
