## Context

Actualmente `app/page.tsx` contiene tres vistas (OperacionView, SimulacionView, ColapsoView) que comparten un sidebar derecho colapsable. Dentro del sidebar, los paneles `PanelAeropuertosOperacion`, `PanelVuelosOperacion` y `PanelEnviosMaletas` se renderizan en secuencia vertical, separados por bordes. El usuario debe scrollear para alternar entre ellos.

La base de código ya utiliza el patrón de tabs en `PanelEnviosMaletas` (sub-tabs Planificados/En Vuelo/Entregados), lo que sirve como referencia de estilo.

## Goals / Non-Goals

**Goals:**
- Reemplazar los 3 paneles apilados por un único componente `PanelTabs` con 3 lengüetas.
- Mantener el comportamiento y props de cada panel interno sin modificaciones.
- Aplicar el cambio a las 3 vistas: OperacionView, SimulacionView y ColapsoView.
- Conservar el resto del sidebar (ResumenVuelos, Entregados, formularios) intacto.

**Non-Goals:**
- No se modifican los paneles internos (`PanelAeropuertosOperacion`, `PanelVuelosOperacion`, `PanelEnviosMaletas`).
- No se modifican estilos globales, tipos, API calls ni lógica de negocio.
- No se agregan dependencias externas.

## Decisions

1. **Componente nuevo en `components/shared/` en vez de inline en page.tsx**
   - Razón: Mantener page.tsx manejable (1417 líneas) y permitir reuso entre las 3 vistas.
   - Alternativa descartada: Tabs inline en cada vista → duplicación de código.

2. **Renderizado condicional por tab (no ocultar con CSS)**
   - Razón: Solo el panel activo se monta en el DOM, reduciendo el peso del sidebar y evitando ciclos de vida innecesarios.
   - Alternativa descartada: `display: none` con CSS → los paneles ocultos seguirían consumiendo recursos (polling, websockets).

3. **Estilo de tabs idéntico al de `PanelEnviosMaletas`**
   - Razón: Consistencia visual con el patrón de UI existente (botones `flex-1 text-[11px]` con azul activo y gris inactivo). Sin necesidad de un componente Tab genérico.

4. **Props planas vs. props agrupadas**
   - Razón: Props planas en la interfaz de `PanelTabs` para facilitar el tipado y el paso desde las vistas. Cada grupo de props (aeropuertos, vuelos, envios) se pasa directamente al panel correspondiente.

5. **`PanelEntregados` se queda fuera de las tabs**
   - Razón: El usuario indicó explícitamente que solo los 3 temas (aeropuerto, vuelo, envíos de maletas) van en las lengüetas. Los entregados recientes son un resumen complementario.

## Risks / Trade-offs

- [Bajo] Al migrar las 3 vistas, podría omitirse alguna prop condicional. → Mitigación: Revisar cada vista una por una y copiar exactamente las props actuales.
- [Bajo] Tabs anidados (el tab "Envíos" contiene sub-tabs) podría confundir usuarios nuevos. → Mitigación: Los sub-tabs ya existían antes; el cambio solo añade un nivel superior que los agrupa. El diseño es estándar en dashboards.
- [Ninguno] Sin cambios en backend, tipos, API, ni tests. El cambio es puramente de composición de componentes React.
