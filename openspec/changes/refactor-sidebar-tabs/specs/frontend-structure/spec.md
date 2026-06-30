## MODIFIED Requirements

### Requirement: Estructura de carpetas (MODIFIED)

The folder structure of `frontend/components/` SHALL include the new shared `PanelTabs.tsx` component in the `components/shared/` directory.

The updated component tree under `frontend/components/shared/` SHALL be:
```
frontend/components/
├── shared/
│   ├── PanelEnviosMaletas.tsx    ← existing (envíos panel with sub-tabs)
│   └── PanelTabs.tsx             ← ADDED (3-tab container for sidebar)
```

### Requirement: Sidebar layout (MODIFIED)

The sidebar layout in the main `page.tsx` dashboard (`OperacionView`, `SimulacionView`, `ColapsoView`) SHALL use `PanelTabs` instead of rendering three individual panels in sequence.

The new sidebar section ordering SHALL be:
1. Session controls (iniciar/pausar/detener)
2. `ResumenVuelosOperacion` (summary cards — unchanged)
3. `PanelEntregados` / `PanelEntregadosOperacion` (recent deliveries — unchanged)
4. `<PanelTabs>` (Aeropuertos / Vuelos / Envíos de Maletas — NEW)
5. Formularios (individual / carga masiva — unchanged)
6. Detail modals (PanelEnviosOperacion / PanelEnvios — unchanged)

#### Scenario: Sidebar renders PanelTabs below Entregados
- **WHEN** the sidebar is expanded in any dashboard view
- **THEN** `PanelTabs` SHALL appear after `PanelEntregados` and before the form section
- **THEN** the three individual panels (Aeropuertos, Vuelos, Envíos) SHALL NOT appear outside of `PanelTabs`
