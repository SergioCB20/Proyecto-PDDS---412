## ADDED Requirements

### Requirement: Map renders airport nodes with valid CSS colors
The simulation map SHALL render airport nodes as colored circles using data from the telemetry WebSocket. The color value received from the backend (`"VERDE"`, `"AMBAR"`, `"ROJO"`) SHALL be mapped to a valid CSS hex color before passing to Leaflet's `CircleMarker`.

**Mapping:**
- `"VERDE"` → `#22c55e` (green)
- `"AMBAR"` → `#eab308` (amber/yellow)
- `"ROJO"` → `#ef4444` (red)
- Any unrecognized value → `#6b7280` (gray fallback)

#### Scenario: Node with VERDE occupancy renders green
- **WHEN** telemetry WebSocket sends a node with `color: "VERDE"`
- **THEN** the CircleMarker SHALL render with fill color `#22c55e`

#### Scenario: Node with AMBAR occupancy renders amber
- **WHEN** telemetry WebSocket sends a node with `color: "AMBAR"`
- **THEN** the CircleMarker SHALL render with fill color `#eab308`

#### Scenario: Node with ROJO occupancy renders red
- **WHEN** telemetry WebSocket sends a node with `color: "ROJO"`
- **THEN** the CircleMarker SHALL render with fill color `#ef4444`

#### Scenario: Unrecognized color value falls back to gray
- **WHEN** telemetry WebSocket sends a node with `color: "DESCONOCIDO"`
- **THEN** the CircleMarker SHALL render with fill color `#6b7280`
- **THEN** the system SHALL NOT crash or show an error

### Requirement: Flight markers adapt opacity based on simulation state
The `GeoMapaVuelo` component SHALL use the `animacionActiva` prop to adjust visual appearance. When `animacionActiva` is `true`, markers and route lines SHALL render at full opacity (1.0). When `animacionActiva` is `false`, markers and route lines SHALL render at reduced opacity (0.4).

#### Scenario: Active simulation shows full opacity flights
- **WHEN** `animacionActiva` is `true`
- **THEN** the flight marker SHALL have opacity 1.0
- **THEN** the Polyline route SHALL have opacity 0.5 (unchanged default)

#### Scenario: Paused simulation shows muted flights
- **WHEN** `animacionActiva` is `false`
- **THEN** the flight marker SHALL have opacity 0.4
- **THEN** the Polyline route SHALL have opacity 0.2

### Requirement: WebSocket connection status is visible
The simulation page SHALL display a visual indicator showing whether the telemetry WebSocket is connected. The indicator SHALL use the `connected` value from the `useTelemetria` hook.

#### Scenario: WebSocket connected shows green indicator
- **WHEN** `useTelemetria` returns `connected: true`
- **THEN** a green dot with "Telemetría conectada" SHALL be displayed in the sidebar

#### Scenario: WebSocket disconnected shows red indicator
- **WHEN** `useTelemetria` returns `connected: false`
- **THEN** a red dot with "Telemetría desconectada" SHALL be displayed in the sidebar
