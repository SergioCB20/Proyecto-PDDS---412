## Why

Los módulos de Operación, Simulación y Colapso muestran actualmente los paneles de Aeropuertos, Vuelos y Envíos de Maletas como listas verticales apiladas dentro del sidebar lateral, lo que obliga al usuario a hacer scroll excesivo para consultar cada sección. Esto perjudica la visibilidad y la productividad del operador/analista.

## What Changes

- Crear un nuevo componente `PanelTabs` en `components/shared/` que agrupa los 3 paneles (Aeropuertos, Vuelos, Envíos de Maletas) en un sistema de 3 lengüetas (tabs).
- Modificar `app/page.tsx` en las vistas `OperacionView`, `SimulacionView` y `ColapsoView` para reemplazar las 3 instancias sueltas por una única instancia de `PanelTabs`.
- Los paneles `ResumenVuelosOperacion`, `PanelEntregados` y los formularios individual/carga masiva permanecen fuera de las tabs, sin cambios.
- `PanelEnviosMaletas` ya tiene 3 sub-tabs internos (Planificados / En Vuelo / Entregados) — se mantienen anidados dentro del tab "Envíos de Maletas".

## Capabilities

### New Capabilities

- `sidebar-tabs`: Componente compartido `PanelTabs` con 3 tabs (Aeropuertos, Vuelos, Envíos de Maletas) para el sidebar de los módulos Operación, Simulación y Colapso.

### Modified Capabilities

- `frontend-structure`: La estructura del sidebar cambia de una lista vertical plana a un layout con tabs, requiriendo actualización del spec de frontend-structure para reflejar la nueva organización del panel lateral.

## Impact

- **Frontend:** `app/page.tsx` (3 vistas), nuevo `components/shared/PanelTabs.tsx`
- **Sin cambios en backend, APIs, ni dependencias**
- **Sin cambios en tipos TypeScript ni contratos**
