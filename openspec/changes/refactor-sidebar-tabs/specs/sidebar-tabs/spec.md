## ADDED Requirements

### Requirement: PanelTabs component with 3 tabs

The system SHALL provide a reusable `PanelTabs` component in `components/shared/` that renders a horizontal tab bar with 3 tabs: "Aeropuertos", "Vuelos", and "Envíos de Maletas". Only the content of the active tab SHALL be mounted in the DOM.

The tab bar SHALL use the same visual style as the existing sub-tabs in `PanelEnviosMaletas`:
- Active tab: `bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300`
- Inactive tab: `bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300`

#### Scenario: Aeropuertos tab shows airport list
- **WHEN** the "Aeropuertos" tab is active
- **THEN** the `PanelAeropuertosOperacion` component SHALL be rendered with the provided props

#### Scenario: Vuelos tab shows flights list
- **WHEN** the "Vuelos" tab is active
- **THEN** the `PanelVuelosOperacion` component SHALL be rendered with the provided props

#### Scenario: Envíos tab shows maletas panel
- **WHEN** the "Envíos de Maletas" tab is active
- **THEN** the `PanelEnviosMaletas` component SHALL be rendered with the provided props (including its internal sub-tabs)

#### Scenario: Switching tabs mounts/unmounts panels
- **WHEN** the user clicks a different tab
- **THEN** the previously active tab's panel SHALL be unmounted
- **THEN** the newly selected tab's panel SHALL be mounted

### Requirement: PanelTabs receives consolidated props

The `PanelTabs` component SHALL accept all props needed by the three internal panels via its own interface. Each group of props SHALL be typed separately to maintain clarity.

#### Scenario: All required props provided
- **WHEN** the parent component provides all required props for all three tabs
- **THEN** `PanelTabs` SHALL render the tab bar and the content of the active tab without errors

#### Scenario: Optional props map correctly
- **WHEN** optional props like `onDownloadManifiesto` or `sesionId` are not provided
- **THEN** the respective tab SHALL render with the available data (e.g., empty state "Sin datos")

### Requirement: Sidebar in OperacionView uses PanelTabs

The `OperacionView` SHALL replace its individual `PanelAeropuertosOperacion`, `PanelVuelosOperacion`, and `PanelEnviosMaletas` instances with a single `<PanelTabs>` component, preserving all existing props and callbacks.

#### Scenario: OperacionView renders PanelTabs
- **WHEN** `OperacionView` renders with telemetria data
- **THEN** `<PanelTabs>` SHALL appear in the sidebar below `PanelEntregadosOperacion`
- **THEN** all three tabs SHALL be functional with the corresponding data

### Requirement: Sidebar in SimulacionView uses PanelTabs

The `SimulacionView` SHALL replace its individual `PanelAeropuertosOperacion`, `PanelVuelosOperacion`, and `PanelEnviosMaletas` instances with a single `<PanelTabs>` component, preserving the conditional rendering logic (show tabs only when `sesionId` is set and session is not FINALIZADA).

#### Scenario: SimulacionView renders PanelTabs
- **WHEN** `SimulacionView` renders with an active session
- **THEN** `<PanelTabs>` SHALL appear in the sidebar with session-aware data
- **THEN** the "Envíos" tab SHALL receive the `sesionId` prop

### Requirement: Sidebar in ColapsoView uses PanelTabs

The `ColapsoView` SHALL replace its individual panel instances with a single `<PanelTabs>` component, preserving the same conditional logic as SimulacionView.

#### Scenario: ColapsoView renders PanelTabs
- **WHEN** `ColapsoView` renders with an active session
- **THEN** `<PanelTabs>` SHALL appear in the sidebar with session-aware data
