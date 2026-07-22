# Tarea: ADD SIMULACION Y OPERACION - Agregar color para vacío

## Descripción

Agregar un color visual distinguible para el estado "vacío" (desconocido, nulo o no manejado) de los vuelos en las vistas de **Simulación** y **Operación**, unificando la lógica de color en una función centralizada.

## Problema detectado

- El color gris `#6b7280` se usaba indistintamente para `COMPLETADO` y como *fallback* para estados desconocidos, impidiendo diferenciarlos visualmente.
- `PanelVuelos.tsx` (simulación) no manejaba el estado `CANCELADO`, cayendo silenciosamente al mismo gris de `COMPLETADO`.
- Los colores de estado de vuelo estaban duplicados como `Record` local en `GeoMapaVuelo.tsx` y `AvionAnimado.tsx`, y como cadenas hex hardcodeadas en los paneles `PanelVuelos.tsx` y `PanelVuelosOperacion.tsx`.

## Archivos modificados

### 1. `frontend/lib/colors.ts`

- Agregada clave `VACIO: '#adbed3'` al objeto `COLOR_VUELO`.
- Agregada función `colorVueloPorEstado(estado: string | null | undefined): string` que devuelve el color correspondiente al estado o `COLOR_VUELO.VACIO` si el estado es desconocido/nulo.

### 2. `frontend/components/simulacion/PanelVuelos.tsx`

- Agregado import de `colorVueloPorEstado`.
- Reemplazada lógica inline `v.estado === 'EN_RUTA' ? '#22c55e' : v.estado === 'PROGRAMADO' ? '#3b82f6' : '#6b7280'` por `colorVueloPorEstado(v.estado)`.
- **Bug corregido**: El estado `CANCELADO` ahora se muestra en rojo `#ef4444` (antes caía a gris por defecto).

### 3. `frontend/components/operacion/PanelVuelosOperacion.tsx`

- Agregado import de `colorVueloPorEstado`.
- Reemplazada lógica inline por `colorVueloPorEstado(v.estado)`.

### 4. `frontend/components/mapa/GeoMapaVuelo.tsx`

- Reemplazado `import { COLOR_VUELO, ... }` por `import { colorVueloPorEstado, ... }`.
- Eliminado el `Record` local `COLORES`.
- Reemplazada expresión `COLORES[vuelo.estado] || '#6b7280'` por `colorVueloPorEstado(vuelo.estado)`.

### 5. `frontend/components/mapa/AvionAnimado.tsx`

- Reemplazado `import { COLOR_VUELO }` por `import { colorVueloPorEstado }`.
- Eliminado el `Record` local `COLORES`.
- Reemplazadas las 5 ocurrencias de `COLORES[vuelo.estado] || '#6b7280'` por `colorVueloPorEstado(vuelo.estado)`.

## Detalle técnico

```typescript
// lib/colors.ts
COLOR_VUELO.VACIO = '#adbed3'

function colorVueloPorEstado(estado: string | null | undefined): string
  // Busca el estado en COLOR_VUELO; si no existe, retorna COLOR_VUELO.VACIO
```

## Impacto visual

| Estado | Color anterior | Color nuevo |
|---|---|---|
| `PROGRAMADO` | `#3b82f6` (azul) | Sin cambio |
| `EN_RUTA` | `#22c55e` (verde) | Sin cambio |
| `CANCELADO` | `#ef4444` (rojo) o `#6b7280` (gris, en simulacion) | `#ef4444` (rojo, corregido) |
| `COMPLETADO` | `#6b7280` (gris) | Sin cambio |
| `null` / `undefined` / desconocido | `#6b7280` (gris, igual que COMPLETADO) | `#9ca3af` (gris más claro, VACIO) |

## Prerrequisitos

- TypeScript compila sin errores nuevos.
- La función `colorVueloPorEstado` se reexporta desde `@/lib/colors` y puede ser usada en cualquier componente futuro.

---

# Tarea: FIX SIMULACION Y OPERACION - Que el panel esté contraído al comienzo

## Descripción

Establecer el panel lateral derecho (sidebar) de las vistas de **Simulación** y **Operación** en estado contraído por defecto al cargar la página, maximizando el área visible del mapa desde el inicio.

## Problema

- Ambos paneles se inicializaban con `useState(false)`, es decir, **abiertos** por defecto (320px de ancho).
- El usuario debía colapsarlos manualmente cada vez que ingresaba a la vista.
- El mapa quedaba parcialmente cubierto innecesariamente.

## Archivo modificado

### `frontend/app/page.tsx`

| Línea | Vista | Cambio |
|---|---|---|
| 186 | `OperacionView` | `useState(false)` → `useState(true)` |
| 521 | `SimulacionView` | `useState(false)` → `useState(true)` |

## Detalle técnico

```typescript
// page.tsx — OperacionView (línea 186)
const [isCollapsed, setIsCollapsed] = useState(true);

// page.tsx — SimulacionView (línea 521)
const [isCollapsed, setIsCollapsed] = useState(true);
```

## Impacto visual

| Aspecto | Antes | Después |
|---|---|---|
| Panel al cargar | Abierto (320px) | Contraído (48px) |
| Mapa al cargar | Parcialmente cubierto | Ocupa todo el viewport |
| Botón para expandir | `ChevronLeft` | `Menu` (hamburguesa) |
| Toggle para colapsar | Sigue funcionando | Sigue funcionando |

## Prerrequisitos

- TypeScript compila sin errores.
- El estado `isCollapsed` ya se usaba correctamente en todas las expresiones condicionales del JSX; solo se cambió el valor inicial.

---

# Tarea: NUEVA VISTA (HASTA EL COLAPSO) - Implementar simulación hasta el colapso, nueva pestaña

## Descripción

Agregar una **tercera pestaña "Colapso"** en el dashboard principal (junto a Operación y Simulación) con una vista dedicada a ejecutar simulaciones en modo `HASTA_COLAPSO`, monitorear la ocupación de almacenes en tiempo real, detectar automáticamente el colapso, y mostrar el reporte correspondiente.

## Problema

- La pestaña "Simulación" usa el tipo por defecto `VENTANA_FIJA` (duración fija de 5 días virtuales), sin opción de ejecutar simulaciones hasta colapso.
- El backend ya soporta `TipoSimulacion.HASTA_COLAPSO` y `EstadoSesion.COLAPSADA`, pero el frontend no los exponía.
- No existía una interfaz dedicada para monitorear la aproximación al colapso (ocupación máxima de almacenes).

## Archivos modificados

### 1. `frontend/lib/types.ts`

- Agregado `'COLAPSADA'` al tipo `MetricasSimulacion.estado` (línea 96).

### 2. `frontend/app/page.tsx`

| Línea | Cambio |
|---|---|
| ~55 | `type DashboardMode` → incluye `'colapso'` |
| ~127 | Agregado tercer botón de pestaña "Colapso" con icono `AlertTriangle` |
| ~131 | Render condicional: `mode === 'colapso' ? <ColapsoView />` |
| ~845+ | Nuevo componente `<ColapsoView>` (~300 líneas) |

## Componente ColapsoView

### Estructura
- Mismo layout que `SimulacionView`: mapa + sidebar colapsable con WebSocket.
- Misma lógica de telemetría, aeropuertos/vuelos en mapa, sub-paneles.
- El panel se inicializa contraído (`isCollapsed = true`).

### Diferencias con SimulacionView

| Aspecto | SimulacionView | ColapsoView |
|---|---|---|
| `tipo_simulacion` | No se envía (default `VENTANA_FIJA`) | Se envía `'HASTA_COLAPSO'` |
| `estadoSesion` incluye | `CONFIGURADA, EN_CURSO, PAUSADA, FINALIZADA` | + `COLAPSADA` |
| Título del panel | "Simulación" | "Colapso" |
| Detección de colapso | No manejado | Polling detecta `estado === 'COLAPSADA'` y gatilla reporte |
| Indicador de ocupación | No tiene | Barra de "Ocupación máxima" con semáforo (verde/ámbar/rojo) |
| Panel de configuración | Sin indicación de tipo | Badge ámbar "Modo: HASTA COLAPSO" con descripción |
| Estados finales | `FINALIZADA` → reporte | `COLAPSADA` → banner rojo + reporte, `FINALIZADA` → banner gris + reporte |

### Lógica de detección de colapso

```typescript
// Polling de métricas cada 3s
api.get<MetricasSimulacion>(`/sesiones/${sesionId}/metricas`).then(m => {
  setMetricasPoll(m);
  if (m.estado === 'COLAPSADA') {
    setEstadoSesion('COLAPSADA');
    fetchReportWithRetry(sesionId);  // reintentos cada 600ms hasta 10 intentos
  }
});
```

### Indicador de ocupación máxima

```tsx
const maxOcupacion = Math.max(
  ...(telemetria?.nodos ?? []).map(n => n.ocupacion_pct)
);
// Renderiza barra de progreso con color según umbrales configurados
```

### Flujo de usuario

1. Usuario navega a la pestaña "Colapso"
2. Ve configuración con badge "Modo: HASTA COLAPSO"
3. Configura fecha/hora virtual y presiona "Iniciar Simulación"
4. La sesión se crea con `tipo_simulacion: 'HASTA_COLAPSO'`
5. Durante la ejecución: métricas en vivo + barra de ocupación máxima
6. Cuando un almacén se satura: backend setea `COLAPSADA`, frontend detecta vía polling
7. Frontend muestra banner rojo "Generando reporte de colapso..." y luego `PanelReporte`
8. Usuario puede iniciar una nueva simulación desde el mismo panel

## Impacto visual

| Elemento | Descripción |
|---|---|
| Tercera pestaña | "Colapso" con icono `AlertTriangle` |
| Sidebar expandido (en ejecución) | Métricas + barra de ocupación máxima con semáforo |
| Sidebar al colapsar | Banner rojo "Generando reporte de colapso..." o banner gris "Generando reporte..." |
| Configuración | Badge ámbar "Modo: HASTA COLAPSO" sobre los inputs de fecha/hora |

## Prerrequisitos

- TypeScript compila sin errores nuevos.
- Backend ya soporta `tipo_simulacion: "HASTA_COLAPSO"` y retorna `estado: "COLAPSADA"` en métricas.
- `PanelReporte` ya renderiza correctamente `punto_colapso_virtual`, `causa_colapso`, etc.
- Sin cambios en backend, `OperacionView`, `SimulacionView`, `PanelReporte` ni componentes de mapa.

---

# Tarea: FIX A LA SIMULACION Y OPERACION - Ubicar horas y métricas dentro del mapa (flotantes)

## Descripción

Mover las métricas (SLA, Cancelaciones, Replanificadas) y la información de tiempo (Tiempo Virtual, Inicio Real, Inicio Virtual, Transcurrido Real) desde el panel lateral hacia el mapa como elementos flotantes, siguiendo el mismo patrón de `GeoMapaLeyenda`. Aplica a las tres vistas: Operación, Simulación y Colapso.

## Problema

- Las métricas y tiempos ocupaban espacio valioso en el sidebar, compitiendo con los controles de sesión y paneles de detalle.
- Al estar el sidebar colapsado (`isCollapsed = true`), las métricas no eran visibles.
- El usuario debía expandir el panel para ver información crítica durante la simulación.

## Archivo modificado

### `frontend/app/page.tsx`

| Vista | Se eliminó del sidebar | Se agregó como flotante en el mapa |
|---|---|---|
| **OperacionView** | `<MetricasOperacion />` completo (4 cards + resumen "X vuelos, Y cancelados") | Flotante top-left con `<MetricasOperacion />` semitransparente |
| **SimulacionView** | Grid 4× MetricCards (SLA, Cancelac, Replanif, Tiempo Virtual) + bloque de tiempos (Inicio Real, Virtual, Transcurrido) | Flotante top-left con 3 chips compactos (SLA, Cancel, Replan) + flotante bottom-left con Tiempo Virtual y 3 líneas de tiempo |
| **ColapsoView** | Ídem SimulacionView + barra de Ocupación máxima | Ídem SimulacionView + barra de Ocupación máxima en el flotante top-left |
| — | Función local `MetricaCard` eliminada (ya no se usa) | — |

### Qué queda en el sidebar (cada vista)

| Vista | Contenido del sidebar |
|---|---|
| **OperacionView** | WS indicator, controles Iniciar/Pausar/Detener, `ResumenVuelosOperacion`, paneles de aeropuertos/vuelos/entregados/envíos, formularios de registro |
| **SimulacionView** | WS indicator, controles Pausar/Reanudar/Detener, paneles de aeropuertos/vuelos/entregados/envíos, config de fecha/hora |
| **ColapsoView** | WS indicator, controles Pausar/Reanudar/Detener, paneles de aeropuertos/vuelos/entregados/envíos, config de fecha/hora + badge "Modo HASTA COLAPSO" |

### Diseño de los flotantes

**SimulacionView y ColapsoView — top-left (métricas):**
```
┌──────────────────────────────────────────┐
│ [SLA 85%] [Cancel 3] [Replan 12]         │  ← bg-white/85 backdrop-blur
│ ┌─ Ocupación máxima ──── 82% ─┐          │  ← solo ColapsoView
│ │ ████████████████░░░░░░░░░   │          │
│ └─────────────────────────────┘          │
└──────────────────────────────────────────┘
```

**SimulacionView y ColapsoView — bottom-left (tiempos):**
```
┌─────────────────────────────┐
│ 🕐 2025-06-03 14:30         │  ← Tiempo Virtual en negrita
│ Inicio Real: 2025-06-01     │
│ Inicio Virtual: 08:00       │
│ Transcurrido: 2h 30m 15s    │
└─────────────────────────────┘
```

**OperacionView — top-left:**
```
┌──────────────────────────────────────┐
│ MetricasOperacion (componente)        │  ← mantiene su aspecto original
│ [Total] [Entregados]                 │
│ [EnVuelo] [Replanif]                 │
│ X vuelos totales · Y cancelados       │
└──────────────────────────────────────┘
```

### Actualización posterior (29 jun 2026) — Migración de flotantes dentro del mapa + MetricasOperacion en todas las vistas

**Problema:** Los flotantes estaban fuera del mapa (hermanos de `<GeoMapa>`, posicionados respecto al `flex-1 p-4 relative` de page.tsx). Esto causaba:
- Solapamiento con el ControlZoom (ambos en `bottom-4 left-4`, el panel de tiempos tapaba la barra de zoom).
- El margen `p-4` del contenedor padre distorsionaba la posición respecto al mapa.
- `MetricasOperacion` solo existía en OperacionView; SimulacionView y ColapsoView no tenían el componente de 4 cards.

**Cambios:**

| Archivo | Cambio |
|---|---|
| `GeoMapa.tsx` | Agregado `children?: ReactNode` a `GeoMapaProps`. Renderizado `{children}` dentro de `<MapContainer>` tras `<GeoMapaLeyenda>`. |
| `page.tsx` — **OperacionView** | `<MetricasOperacion />` movido de hermano a hijo de `<GeoMapa>` (misma posición `top-4 left-4`). |
| `page.tsx` — **SimulacionView** | Ambos flotantes movidos dentro de `<GeoMapa>`. Panel de tiempos migrado de `bottom-4 left-4` a `top-4 right-4`. Agregado `<MetricasOperacion />` apilado sobre el panel de tiempos. |
| `page.tsx` — **ColapsoView** | Ídem SimulacionView: 3 chips + barra ocupación en `top-4 left-4`. `<MetricasOperacion />` + panel de tiempos en `top-4 right-4`. |

**Layout final dentro del mapa:**

```
┌───────────────────────────────────────────────────┐
│  ┌───────────────────┐     ┌────────────────────┐ │
│  │ SLA 85%           │     │ Métricas de Sesión │ │
│  │ Cancel 3          │     │ ┌──────┐ ┌──────┐  │ │
│  │ Replan 12         │     │ │Total │ │Entre.│  │ │
│  │                   │     │ ├──────┤ ├──────┤  │ │
│  │ (Colapso:         │     │ │En    │ │Replan│  │ │
│  │  Ocup. 82% ████░) │     │ │Vuelo │ │      │  │ │
│  │                   │     │ └──────┘ └──────┘  │ │
│  │  top-4 left-4     │     │ X vuelos · Y canc.  │ │
│  │  z-[1001]         │     │                    │ │
│  └───────────────────┘     │ 🕐 2025-06-03...  │ │
│                             │ Inicio Real: ...  │ │
│  ┌──────────┐              │ Transcurrido: 2h  │ │
│  │ Zoom     │              │                    │ │
│  │ ───●───  │              │  top-4 right-4     │ │
│  │ -     +  │              │  z-[1001]           │ │
│  └──────────┘              └────────────────────┘ │
│  bottom-4 left-4           ┌─────────────┐        │
│  z-[1000]                  │ Ocupación   │        │
│                             │ 🟢🟡🔴     │        │
│                             │ Estado Vuelos│       │
│                             └─────────────┘        │
│                             bottom-4 right-4        │
│                             z-[1000]                │
└───────────────────────────────────────────────────┘
```

**Distribución por vista:**

| Posición | OperacionView | SimulacionView | ColapsoView |
|---|---|---|---|
| `top-4 left-4` | `MetricasOperacion` | 3 chips (SLA/Cancel/Replan) | 3 chips + barra ocupa |
| `top-4 right-4` | — | `MetricasOperacion` + panel de tiempos | `MetricasOperacion` + panel de tiempos |
| `bottom-4 left-4` | ControlZoom | ControlZoom | ControlZoom |
| `bottom-4 right-4` | GeoMapaLeyenda | GeoMapaLeyenda | GeoMapaLeyenda |

**Detalle técnico de GeoMapa:**
```tsx
// GeoMapa.tsx
interface GeoMapaProps {
  // ... props existentes
  children?: ReactNode;         // ← nuevo
}

// Dentro del return, después de <GeoMapaLeyenda>
<MapContainer ...>
  <TileLayer ... />
  {aeropuertos.map(...)}
  {vuelos.map(...)}
  <ControlZoom />
  <GeoMapaLeyenda umbralesConfig={umbralesConfig} />
  {children}                     // ← nuevo: flotantes ahora dentro del mapa
</MapContainer>
```

**Verificación:** TypeScript compila sin errores nuevos (solo los 7 pre-existentes en `.next/types/validator.ts` sobre app router pages que no existen en este SPA).

### Actualización posterior 2 (29 jun 2026) — Flotantes siempre visibles sin condicional de estado

**Problema:** Los flotantes en SimulacionView y ColapsoView estaban envueltos en `{(estadoSesion === 'EN_CURSO' || estadoSesion === 'PAUSADA') && (...)}`. Si no había una sesión activa (`estadoSesion` arranca vacío o `'CONFIGURADA'`), los flotantes no se renderizaban. Esto daba la impresión errónea de que faltaban datos del backend.

**Solución:** Eliminar el condicional que envolvía los flotantes en ambas vistas. Ahora se renderizan siempre, independientemente del estado de la sesión. Los chips (SLA/Cancel/Replan) y el panel de tiempos muestran valores por defecto (`0` / `-`) cuando no hay sesión activa, y `<MetricasOperacion />` se carga con sus propios datos independientemente.

**Archivo modificado:**

| Archivo | Cambio |
|---|---|
| `page.tsx` — **SimulacionView** | Eliminado `{(estadoSesion === 'EN_CURSO' || estadoSesion === 'PAUSADA') && (...)}` alrededor de los flotantes. |
| `page.tsx` — **ColapsoView** | Eliminado el mismo condicional. |

**Antes:**
```tsx
<GeoMapa ...>
  {(estadoSesion === 'EN_CURSO' || estadoSesion === 'PAUSADA') && (
    <>
      <div className="absolute top-4 left-4 ...">...</div>
      <div className="absolute top-4 right-4 ...">...</div>
    </>
  )}
</GeoMapa>
```

**Después:**
```tsx
<GeoMapa ...>
  <div className="absolute top-4 left-4 ...">...</div>
  <div className="absolute top-4 right-4 ...">...</div>
</GeoMapa>
```

**Verificación:** TypeScript compila sin errores. Los flotantes ahora son visibles siempre, sin depender del estado de la sesión.

### Actualización posterior 3 (29 jun 2026) — Ocupación máxima en SimulacionView + flotantes completos en OperacionView

**Problema:**
- SimulacionView no tenía la barra de "Ocupación máxima" (presente en ColapsoView).
- OperacionView solo tenía `<MetricasOperacion />` como flotante; faltaban los 3 chips (SLA/Cancel/Replan), la barra de ocupación y el panel informativo.

**Cambios realizados:**

| Archivo | Vista | Cambio |
|---|---|---|
| `page.tsx` | **SimulacionView** | Agregado `maxOcupacion` (derivado de `telemetria.nodos` + `initialAeropuertos`) y barra de ocupación con semáforo (verde/ámbar/rojo) en `top-4 left-4`, debajo de los 3 chips. |
| `page.tsx` | **OperacionView** | Replicado layout completo de ColapsoView: |
| | | — `top-4 left-4`: 3 chips (SLA/Cancel/Replan) + barra ocupación máxima |
| | | — `top-4 right-4`: `<MetricasOperacion />` + panel informativo (hora real, estado operación, WS, vuelos) |
| | | Agregado `maxOcupacion` y referencia a `telemetria?.metricas_sesion` para los chips. |

**Layout final por vista:**

```
OperacionView:
  top-4 left-4:  [SLA %] [Cancel N] [Replan N] + barra Ocupación máxima
  top-4 right-4: MetricasOperacion (4 cards) + panel informativo (stack)

SimulacionView:
  top-4 left-4:  [SLA %] [Cancel N] [Replan N] + barra Ocupación máxima ← NUEVO
  top-4 right-4: MetricasOperacion (4 cards) + panel de tiempos (stack)

ColapsoView:
  top-4 left-4:  [SLA %] [Cancel N] [Replan N] + barra Ocupación máxima
  top-4 right-4: MetricasOperacion (4 cards) + panel de tiempos (stack)
```

**Sin cambios en:** `ColapsoView`, `GeoMapa.tsx`, `ControlZoom.tsx`, `GeoMapaLeyenda.tsx`, tipos, backend.

---

# Tarea: FIX FLOTANTES - Recuadro como Leyenda y posición de tiempos

## Descripción

Corregir el estilo visual de los elementos flotantes (métricas y tiempos) en las tres vistas (Operación, Simulación y Colapso) para que tengan el mismo recuadro que `GeoMapaLeyenda`: fondo `bg-white/90`, borde, sombra y `backdrop-blur-sm`. Además, ajustar la posición del flotante de tiempos para que no sea tapado por la atribución de Leaflet.

## Problema

- Los flotantes usaban `bg-white/85` (85% opacidad) vs Leyenda que usa `bg-white/90` (90%), haciendo que el borde `border` se perdiera visualmente contra el mapa.
- El flotante de tiempos estaba en `bottom-4` (16px desde abajo), quedando detrás del control de atribución de Leaflet (`© OpenStreetMap`) en la esquina inferior izquierda.
- El flotante de `MetricasOperacion` en la vista Operación no tenía ningún recuadro: su wrapper carecía de `bg-white/90`, `rounded-lg`, `border`, `shadow-lg`.
- El componente `MetricasOperacion` conservaba un `border-t` residual de cuando estaba en el sidebar, que ya no tenía sentido al estar flotando.

## Archivos modificados

### 1. `frontend/app/page.tsx`

| Línea | Vista | Cambio |
|---|---|---|
| 692 | Simulación — métricas | `bg-white/85` → `bg-white/90` |
| 711 | Simulación — tiempos | `bg-white/85` → `bg-white/90` |
| 1055 | Colapso — métricas | `bg-white/85` → `bg-white/90` |
| 1072 | Colapso — ocupación | `bg-white/85` → `bg-white/90` |
| 1088 | Colapso — tiempos | `bg-white/85` → `bg-white/90` |
| 353 | Operación — wrapper | Agregado `rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg border border-slate-200 dark:border-slate-700` |

### 2. `frontend/components/mapa/GeoMapa.tsx`

| Línea | Cambio |
|---|---|
| 43 | Agregado `attributionControl={false}` al `MapContainer` para eliminar la atribución de Leaflet que se superponía con el flotante de tiempos en bottom-left |

### 2. `frontend/components/operacion/MetricasOperacion.tsx`

| Línea | Cambio |
|---|---|
| 65 | Eliminado `border-t border-slate-200 dark:border-slate-700` del contenedor principal (ya no está en sidebar) |

## Detalle técnico

```tsx
// page.tsx — OperacionView (línea 353, antes)
<div className="pointer-events-auto">

// page.tsx — OperacionView (línea 353, después)
<div className="pointer-events-auto rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg border border-slate-200 dark:border-slate-700">

// page.tsx — Todos los flotantes (líneas 692, 711, 1055, 1072, 1088; antes)
bg-white/85 dark:bg-slate-900/85

// page.tsx — Todos los flotantes (después)
bg-white/90 dark:bg-slate-900/90

// page.tsx — Tiempos (se mantiene `bottom-4` como Leyenda)
absolute bottom-4 left-4

// GeoMapa.tsx — Se elimina la atribución de Leaflet que solapaba con el flotante de tiempos
attributionControl={false}
```

## Impacto visual

| Aspecto | Antes | Después |
|---|---|---|
| Borde del flotante | Casi invisible contra el mapa (85% opacidad) | Visible como el de Leyenda (90% opacidad) |
| Tiempos en bottom-left | Tapados por atribución de Leaflet | Visibles con margen de 16px (`bottom-4`, igual que Leyenda); atribución de Leaflet oculta |
| MetricasOperacion en Operación | Flotaba sin marco | Mismo recuadro blanco que Leyenda |
| MetricasOperacion — borde interno | `border-t` residual del sidebar | Sin borde interno |

## Prerrequisitos

- TypeScript compila sin errores.
- `bg-white/90` y `dark:bg-slate-900/90` ya están en uso por `GeoMapaLeyenda`.
- `bottom-4` (16px) mantiene el mismo margen que Leyenda desde el borde del mapa.
- `attributionControl={false}` elimina la atribución de Leaflet que solapaba con el flotante de tiempos.
- Sin cambios en backend, tipos ni otros componentes.

---

## Contexto completo de cambios en flotantes (para reanudar en futuros chats)

**¿Qué se implementó en la sesión del 26-29 jun 2026?**

Se movieron las métricas (SLA, Cancelaciones, Replanificadas) y la información de tiempo (Tiempo Virtual, Inicio Real, Inicio Virtual, Transcurrido Real) desde el panel lateral hacia el mapa como elementos flotantes semitransparentes, siguiendo el mismo patrón visual de `GeoMapaLeyenda`. Aplica a las tres vistas: Operación, Simulación y Colapso. Posteriormente se corrigió el recuadro visual de todos los flotantes para que coincidiera exactamente con el estilo de Leyenda (`bg-white/90`, `rounded-lg`, `border`, `shadow-lg`) y se ocultó la atribución de Leaflet que solapaba con el flotante de tiempos.

Posteriormente (29 jun) se migraron todos los flotantes a estar DENTRO del mapa (como hijos de `<GeoMapa>` en lugar de hermanos), se reposicionó el panel de tiempos de `bottom-4 left-4` a `top-4 right-4` para evitar solapamiento con el ControlZoom, y se agregó el componente `<MetricasOperacion />` (4 cards) a las vistas SimulacionView y ColapsoView.

**¿Dónde está el código?**

- `frontend/components/mapa/GeoMapa.tsx`:
  - Línea 25: `children?: ReactNode` en `GeoMapaProps`.
  - Línea 95: `{children}` renderizado dentro de `<MapContainer>` tras `<GeoMapaLeyenda>`.
  - Línea 70: `attributionControl={false}` en `<MapContainer>`.

- `frontend/app/page.tsx`:
  - **OperacionView** (~línea 352): `<MetricasOperacion />` como hijo de `<GeoMapa>` en `top-4 left-4` con recuadro de Leyenda.
  - **SimulacionView** (~líneas 700–745): Flotantes dentro de `<GeoMapa>`. Top-left: 3 chips. Top-right: `<MetricasOperacion />` + panel de tiempos apilados. Solo visibles cuando `estadoSesion === 'EN_CURSO' || estadoSesion === 'PAUSADA'`.
  - **ColapsoView** (~líneas 1075–1135): Ídem SimulacionView + barra de Ocupación máxima con semáforo (verde/ámbar/rojo) en el flotante top-left.

- `frontend/components/operacion/MetricasOperacion.tsx` (~línea 65): Eliminado `border-t` residual del contenedor principal.

**Diseño unificado de recuadro:**
```
bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg
```

**¿Qué NO se modificó?**
- Backend: sin cambios.
- `GeoMapaLeyenda.tsx`, `ControlZoom.tsx`: sin cambios.
- `PanelReporte`, `PanelVuelos`, `PanelVuelosOperacion`, `PanelAeropuertos`, `PanelEnvios`, `PanelEntregados`, `ResumenVuelosOperacion`: sin cambios.
- Tipos (`lib/types.ts`): sin cambios.
- Funcionalidad de las vistas: sin cambios (solo se movió la presentación de métricas/tiempos al mapa y dentro del mapa).

### Actualización posterior 4 (29 jun 2026) — Formato de panel de tiempos + tiles CartoDB

**Problema:**
- El panel de tiempos en SimulacionView y ColapsoView tenía formato antiguo: header con reloj + Tiempo Virtual, seguido de 3 líneas (Inicio Real, Inicio Virtual, Transcurrido). Faltaban Actual Real y Actual Virtual.
- Los tiles de OpenStreetMap estaban en inglés/español mixto; se requería CartoDB Positron con etiquetas exclusivamente en inglés sin API key.
- El helper `formatSegundos` daba formato simple (`h m s`) sin zero-padding; se necesitaba un helper `formatoHms` con padding.

**Cambios realizados:**

| Archivo | Cambio |
|---|---|
| `page.tsx` — helpers | Agregado `formatoHms(h,m,s)` que retorna `00h 00m 00s` con zero-padding. |
| `page.tsx` — SimulacionView | Panel de tiempos reemplazado: `min-w-[170px]` → `min-w-[220px]`; nuevo formato con Inicio Real, Inicio Virtual, separador `border-t`, Actual Real (hora del sistema), Actual Virtual (extraído de `metricas.dia_hora_virtual`), Transcurrido. |
| `page.tsx` — ColapsoView | Ídem SimulacionView. |
| `GeoMapa.tsx` | TileLayer actualizado de OSM estándar a CartoDB Positron (`light_all` / English): `url="https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"`. |

**Nuevo formato del panel de tiempos:**
```
┌──────────────────────────────────┐
│ Inicio Real: 2025-06-01 08:00:00 │
│ Inicio Virtual: 2025-06-01 08:00 │
│──────────────────────────────────│
│ Actual Real: 14h 30m 25s        │  ← hora del sistema en vivo
│ Actual Virtual: 03d 14h 30m 25s │  ← extraído de dia_hora_virtual
│ Transcurrido: 2h 30m 15s        │  ← formato original
└──────────────────────────────────┘
```

**Detalle técnico:**
```typescript
// Helper agregado en page.tsx (~línea 50)
function formatoHms(h: number, m: number, s: number): string {
  return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

// Actual Real se computa con new Date() en cada render
{(() => { const d = new Date(); return formatoHms(d.getHours(), d.getMinutes(), d.getSeconds()); })()}

// Actual Virtual se extrae de metricas.dia_hora_virtual (formato "2025-06-03T14:30:00")
{metricas.dia_hora_virtual ? (() => { const p = metricas.dia_hora_virtual.split('T')[1]?.split(':') ?? []; return formatoHms(...) })() : '-'}
```

**Verificación:** TypeScript compila sin errores. Los paneles de ambas vistas tienen el mismo formato exacto. Los tiles ahora muestran etiquetas en inglés de CartoDB Positron sin necesidad de API key.

---

### Actualización posterior 5 (29 jun 2026) — Reloj en vivo para Actual Real + revertir tiles a OSM + revertir VACIO a #9ca3af

**Problema:**
- `Actual Real` se computaba con `new Date()` solo al renderizar (cada ~3s por el polling de métricas), no tickeaba en tiempo real.
- Los tiles CartoDB Positron tenían paleta muy clara/gris que eliminaba los colores vivos del mapa (parques verdes, agua azul) que sí tiene OSM estándar.
- El color `VACIO: '#adbed3'` añadía un tinte azul-gris que aplanaba la paleta del mapa; se revierte a `#9ca3af` (gris neutro original).

**Cambios realizados:**

| Archivo | Cambio |
|---|---|
| `page.tsx` — helpers | Agregado hook `useReloj()`: estado `hora` actualizado cada 1s con `setInterval`. |
| `page.tsx` — SimulacionView | Agregado `const hora = useReloj()`. `Actual Real` ahora usa `formatoHms(hora.getHours(), hora.getMinutes(), hora.getSeconds())`. |
| `page.tsx` — ColapsoView | Ídem SimulacionView. |
| `GeoMapa.tsx` | TileLayer **revertido** de CartoDB Positron a OSM estándar: `url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"`. |
| `lib/colors.ts` | `VACIO` revertido de `#adbed3` → `#9ca3af`. |

**Detalle técnico:**
```typescript
// Hook agregado en page.tsx
function useReloj() {
  const [hora, setHora] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return hora;
}

// En SimulacionView y ColapsoView
const hora = useReloj();
// Actual Real en JSX:
{formatoHms(hora.getHours(), hora.getMinutes(), hora.getSeconds())}
```

**Verificación:** TypeScript compila sin errores. El `Actual Real` ahora se actualiza cada 1 segundo independientemente del polling de métricas.

---

### Actualización posterior 6 (final, 29 jun 2026) — Display fecha+hora con hora local del navegador + sincronización de campos

**Problemas resueltos:**
- `Inicio Real` mostraba `metricas.fecha_inicio_real` (hora del servidor, no del navegador del usuario).
- `Actual Real` / `Actual Virtual` mostraban solo la hora (`14h 30m 25s`), no la fecha completa.
- `Inicio Virtual` había perdido la hora (solo fecha).
- Sin sesión activa, `Inicio Real` y `Actual Virtual` mostraban `-` en vez de la hora actual.
- `Actual Real` no se congelaba al iniciar simulación.

**Cambios realizados (solo visual, lógica interna intacta):**

| Archivo | Cambio |
|---|---|
| `page.tsx` — helpers | Agregado `formatoFechaHoraLocal(d: Date)` (retorna `YYYY-MM-DD HH:mm:ss` en zona local) y `useReloj()` (live clock cada 1s). |
| `page.tsx` — SimulacionView | Agregado estado `inicioRealMs` capturado con `Date.now()` al iniciar/reanudar sesión. Reseteado a `0` al detener. Agregado `useReloj()` → `hora`. |
| `page.tsx` — ColapsoView | Ídem SimulacionView. |
| `page.tsx` — OperacionView | Agregado `useReloj()` → `hora`. Time panel ahora usa `formatoFechaHoraLocal(hora)` live en vez de `new Date().toLocaleString()` estático. |
| `page.tsx` — time panels | Display actualizado con reemplazos `replaceAll` en ambas vistas de simulación. Se agregó `:00` a `hora_inicio_virtual` para uniformidad con los segundos del resto de campos. `Actual Virtual` sin datos ahora arranca con la misma fecha+hora que `Inicio Virtual` (del config) en vez del live clock. |

**Nuevo display completo:**
```
┌──────────────────────────────────────────────┐
│ Inicio Real:    2026-06-29 10:30:45          │  ← congelado si hay sesión;
│                                              │    si no, hora al cargar página
│ Inicio Virtual: 2026-01-02 08:00             │  ← fecha+hora del config
│ ──────────────────────────────────────────── │
│ Actual Real:    2026-06-29 10:30:45          │  ← congelado = Inicio Real
│                                              │    (si hay sesión);
│                                              │    live clock si no
│ Actual Virtual: 2026-06-03 14:30:00          │  ← del backend si hay datos;
│                                              │    live clock si no
│ Transcurrido:   2h 30m 15s                   │  ← sin cambios
└──────────────────────────────────────────────┘
```

**Comportamiento por campo (display, no lógica):**

| Campo | Sin sesión | Con sesión activa |
|---|---|---|
| **Inicio Real** | Fecha+hora actual (al cargar página, estático) | Fecha+hora capturada al iniciar (congelado) |
| **Inicio Virtual** | Según config (`fecha + hora`) | Según config |
| **Actual Real** | Live clock tickeando (cada 1s) | Congelado = Inicio Real |
| **Actual Virtual** | Live clock tickeando | Fecha+hora virtual del backend |
| **Transcurrido** | `0h 0m 0s` | Según backend |

**Detalle técnico:**
```typescript
// Helper de fecha+hora local del navegador
function formatoFechaHoraLocal(d: Date): string {
  const y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${M}-${D} ${h}:${m}:${s}`;
}

// Hook live clock
function useReloj() {
  const [hora, setHora] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return hora;
}

// Captura al iniciar sesión (en handleIniciar / handleReanudar)
setInicioRealMs(Date.now());

// JSX de los time panels (SimulacionView + ColapsoView)
<span>{formatoFechaHoraLocal(new Date(inicioRealMs || Date.now()))}</span>        // Inicio Real
<span>{simulacionConfig.fecha_inicio_virtual} {simulacionConfig.hora_inicio_virtual}</span>  // Inicio Virtual
<span>{sesionId ? formatoFechaHoraLocal(new Date(inicioRealMs)) : formatoFechaHoraLocal(hora)}</span>  // Actual Real
<span>{metricas.dia_hora_virtual?.slice(0, 19).replace('T', ' ') || formatoFechaHoraLocal(hora)}</span>  // Actual Virtual
<span>{formatSegundos(metricas.segundos_reales_transcurridos ?? 0)}</span>        // Transcurrido

// OperacionView (panel informativo)
<span>{formatoFechaHoraLocal(hora)}</span>  // header con Clock icon
```

**Verificación:** TypeScript compila sin errores. `Date.now()` es UTC; `useReloj()` usa `Date` estándar (UTC internamente); `dia_hora_virtual` sigue siendo ISO string del backend. Cero modificaciones a lógica de negocio, backend, tipos o componentes de mapa.

**Verificación:** TypeScript compila sin errores. Lógica interna intacta — `Date.now()` es UTC, `hora` de `useReloj()` es un objeto `Date` estándar, `dia_hora_virtual` sigue siendo ISO string del backend. Solo cambia cómo se muestran los valores en pantalla.

---

### Historial cronológico de versiones de tiles del mapa

| Orden | Fecha | Tile URL | Proveedor | Paleta | Etiquetas |
|---|---|---|---|---|---|
| 1 (original) | 26 jun 2026 | `{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` | OpenStreetMap | Viva — verde, azul, grises | Inglés (default) |
| 2 | 29 jun 2026 | `a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png` | CartoDB Positron | Muy clara — blanco/gris, sin vegetación | Inglés |
| 3 | 29 jun 2026 | `{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` | OpenStreetMap (revertido) | Viva — verde, azul, grises | Mixto (idioma local) |
| 4 (actual) | 29 jun 2026 | `{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png` | CartoDB Voyager | Viva — verde, azul, relieve sutil | Inglés homogéneo |

**Nota:** Si en el futuro se requiere cambiar los tiles:
- **OpenStreetMap estándar**: `{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` — attribution `'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'`
- **CartoDB Voyager** (actual): `{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`
- **CartoDB Positron**: `{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`
- Voyager y Positron requieren: `attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'`
- Siempre usar `https://` (sin API key) y subdominio `a.`, `b.`, `c.` indistintamente.

---

---

# Tarea: FILTRO POR OCUPACION - Agregar filtro por color de semáforo en panel vuelos y aeropuertos

## Descripción

Agregar un bloque de filtro por color de semáforo (VERDE, ÁMBAR, ROJO) basado en ocupación, en el panel lateral de la vista **Operación**. El filtro se refleja tanto en los paneles de aeropuertos y vuelos como en los marcadores del mapa.

## Problema

- No existía forma de filtrar elementos por nivel de ocupación (verde/ámbar/rojo).
- Los paneles de aeropuertos y vuelos mostraban todos los elementos independientemente de su ocupación.
- El mapa tampoco permitía filtrar visualmente por nivel de ocupación.

## Archivos modificados

### 1. `frontend/lib/colors.ts`

- Agregado tipo `ColorSemaforo = 'VERDE' | 'AMBAR' | 'ROJO'`.
- Agregada función `determinarColorSemaforo(pct, umbrales?)` que retorna la categoría según ocupación y umbrales configurables (default 70/90).

```typescript
export type ColorSemaforo = 'VERDE' | 'AMBAR' | 'ROJO';

export function determinarColorSemaforo(
  pct: number,
  umbrales?: { verdeMax?: number; ambarMax?: number }
): ColorSemaforo {
  const vm = umbrales?.verdeMax ?? 70;
  const am = umbrales?.ambarMax ?? 90;
  if (pct < vm) return 'VERDE';
  if (pct < am) return 'AMBAR';
  return 'ROJO';
}
```

### 2. `frontend/components/operacion/PanelAeropuertosOperacion.tsx`

- Agregados props: `filtroColor?: string`, `onFilterColorChange?: (color: string) => void`, `umbralesConfig?: { verdeMax: number; ambarMax: number }`.
- Importado `determinarColorSemaforo` desde `@/lib/colors`.
- En `aeropuertosFiltrados` (useMemo): agregado filtro por `determinarColorSemaforo(n.ocupacion_pct, umbralesConfig) === filtroColor`.
- `hayFiltrosActivos` ahora incluye `filtroColor`.
- `limpiarFiltros` también llama a `onFilterColorChange?.('')` para limpiar el filtro de color.

### 3. `frontend/components/operacion/PanelVuelosOperacion.tsx`

- Agregados props: `filtroColor?: string`, `umbralesConfig?: { verdeMax: number; ambarMax: number }`.
- Importado `determinarColorSemaforo` desde `@/lib/colors`.
- En `vuelosFiltrados` (useMemo): agregado filtro por `determinarColorSemaforo(v.ocupacion_pct, umbralesConfig) === filtroColor`.

### 4. `frontend/components/shared/PanelTabs.tsx`

- Agregados props: `filtroColor?: string`, `onFilterColorChange?: (color: string) => void`, `umbralesConfig?: { verdeMax: number; ambarMax: number }`.
- Pasados los nuevos props a ambos componentes `PanelAeropuertosOperacion` y `PanelVuelosOperacion`.

### 5. `frontend/components/mapa/GeoMapa.tsx`

- Agregada prop `filtroColor?: string` a `GeoMapaProps`.
- Importado `determinarColorSemaforo` desde `@/lib/colors`.
- `aeropuertosFiltrados`: después del filtro por seguido, se aplica filtro por color usando `determinarColorSemaforo(a.ocupacionPorcentaje, umbralesConfig)`.
- `vuelosFiltrados`: después del filtro por seguido, se aplica filtro por color calculando el pct desde `capacidad_carga - carga_disponible`.

### 6. `frontend/app/page.tsx` — OperacionView

- Agregado import de `determinarColorSemaforo` y `type ColorSemaforo`.
- Agregado estado `const [filtroColor, setFiltroColor] = useState<'' | ColorSemaforo>('')`.
- Agregado bloque UI "Filtro por Ocupación" entre los controles de operación y `PanelTabs`:
  - 4 botones toggle: "Todos", círculo verde, círculo ámbar, círculo rojo.
  - Mismo estilo que los botones de filtro de equipaje en el mapa.
- Pasado `filtroColor` a `<GeoMapa>`.
- Pasados `filtroColor`, `onFilterColorChange={setFiltroColor}` y `umbralesConfig={configUmbrales}` a `<PanelTabs>`.

## Arquitectura del filtro

```
OperacionView (page.tsx)
  │
  ├── Estado: filtroColor ('' | 'VERDE' | 'AMBAR' | 'ROJO')
  │
  ├── [BLOQUE UI] "Filtro por Ocupación" ── 4 botones toggle
  │   └── Entre controles de operación y PanelTabs
  │
  ├──→ PanelTabs ──→ PanelAeropuertosOperacion (filtra con ocupacion_pct + umbrales)
  │               └──→ PanelVuelosOperacion (filtra con ocupacion_pct + umbrales)
  │
  └──→ GeoMapa (filtra aeropuertosFiltrados/vuelosFiltrados con color)
```

## Criterio de color

| Categoría | Rango (umbrales default) | Hex |
|---|---|---|
| VERDE | ocupación < 70% | `#22c55e` |
| ÁMBAR | 70% ≤ ocupación < 90% | `#eab308` |
| ROJO | ocupación ≥ 90% | `#ef4444` |

## Flujo de datos

1. El usuario selecciona un color en los botones del panel lateral.
2. `setFiltroColor` actualiza el estado en `OperacionView`.
3. El cambio se propaga a:
   - `PanelAeropuertosOperacion` — vuelve a filtrar la lista via useMemo.
   - `PanelVuelosOperacion` — vuelve a filtrar la lista via useMemo.
   - `GeoMapa` — vuelve a filtrar los marcadores visibles.
4. Al seleccionar "Todos" (`''`), se muestran todos los elementos sin filtro de color.

## Impacto visual

```
ANTES:
┌─ Panel lateral ─────────────────┐
│ [Iniciar Operación]             │
│ ┌─ Aeropuertos | Vuelos ────┐  │
│ │ [Buscar...] [Continente..] │  │
│ │ • LIM 45%  • MIA 80%      │  │
│ └────────────────────────────┘  │
└─────────────────────────────────┘

DESPUÉS:
┌─ Panel lateral ─────────────────┐
│ [Iniciar Operación]             │
│ ┌─ Filtro por Ocupación ────┐  │
│ │ [Todos] [●] [●] [●]       │  │
│ └────────────────────────────┘  │
│ ┌─ Aeropuertos | Vuelos ────┐  │
│ │ [Buscar...] [Continente..] │  │
│ │ • LIM 45%  • MIA 80%      │  │
│ └────────────────────────────┘  │
└─────────────────────────────────┘
```

## Prerrequisitos

- TypeScript compila sin errores nuevos (build exitoso).
- Los umbrales `verdeMax`/`ambarMax` se toman del `ConfigUmbrales` ya existente.
- Sin cambios en backend, tipos, SimulacionView, ColapsoView ni componentes de mapa existentes.
- Botón "Limpiar filtros" en PanelAeropuertosOperacion también resetea el filtro de color.

---

# Tarea: OCUPACION GLOBAL - Reemplazar Ocupación Máxima por Ocupación Global (suma/suma)

## Descripción

Reemplazar la métrica **"Ocupación máxima"** (que mostraba el porcentaje del aeropuerto individual más ocupado) por **"Ocupación global"** (suma total de ocupaciones / suma total de capacidades × 100). Aplica a las tres vistas: Operación, Simulación y Colapso.

## Problema

- La métrica "Ocupación máxima" mostraba `Math.max(...nodos.ocupacion_pct)`, que solo reflejaba el nodo más congestionado, no la ocupación real del sistema completo.
- No había una métrica agregada que indicara qué tan lleno está el sistema en su conjunto.
- Para la detección de saturación general, se necesita conocer la ocupación global (promedio ponderado).

## Fórmula

```
ocupacion_global = (Σ ocupacion_actual) / (Σ capacidad_almacen) × 100
```

Donde:
- `Σ ocupacion_actual` = suma de maletas almacenadas en todos los aeropuertos/nodos
- `Σ capacidad_almacen` = suma de capacidades máximas de todos los aeropuertos/nodos

## Archivo modificado

### `frontend/app/page.tsx`

| Vista | Línea (aprox.) | Cambio |
|---|---|---|
| **OperacionView** | 570 | `maxOcupacion = Math.max(...)` → `ocupacionGlobal = useMemo()` con `aeropuertos.reduce(...)` |
| **OperacionView** | 653-686 | Label `"Ocupación máxima"` → `"Ocupación global"`, variable `maxOcupacion` → `ocupacionGlobal`, `toFixed(0)` → `toFixed(1)` |
| **SimulacionView** | 1630 | `maxOcupacion = Math.max(...)` → `ocupacionGlobal = useMemo()` con `aeropuertosMapa.reduce(...)` |
| **SimulacionView** | 1704-1737 | Mismos reemplazos que OperacionView |
| **ColapsoView** | 2423 | `maxOcupacion = Math.max(...)` → `ocupacionGlobal = useMemo()` con `aeropuertosMapa.reduce(...)` |
| **ColapsoView** | 2685-2718 | Mismos reemplazos que OperacionView |

## Detalle técnico de los cómputos

### OperacionView (usa `aeropuertos` como fuente única)

```typescript
const ocupacionGlobal = useMemo(() => {
  const sumOcup = aeropuertos.reduce((s, a) => s + (a.ocupacion_actual || 0), 0);
  const sumCap = aeropuertos.reduce((s, a) => s + (a.capacidad_almacen || 0), 0);
  return sumCap > 0 ? (sumOcup / sumCap) * 100 : 0;
}, [aeropuertos]);
```

### SimulacionView y ColapsoView (usan `aeropuertosMapa` como fuente única)

```typescript
const ocupacionGlobal = useMemo(() => {
  const sumOcup = aeropuertosMapa.reduce((s, a) => s + (a.ocupacion_actual || 0), 0);
  const sumCap = aeropuertosMapa.reduce((s, a) => s + (a.capacidad_almacen || 0), 0);
  return sumCap > 0 ? (sumOcup / sumCap) * 100 : 0;
}, [aeropuertosMapa]);
```

**¿Por qué `aeropuertosMapa` en Simulación/Colapso?** Porque `aeropuertosMapa` ya es la fuente de verdad única que mezcla telemetría (`telemetria?.nodos`) con datos iniciales (`initialAeropuertos`). Usarla directamente evita doble conteo y mantiene consistencia con lo que se renderiza en el mapa.

## Lo que se mantiene igual

- ✅ Colores de semáforo: verde (`#22c55e`), ámbar (`#eab308`), rojo (`#ef4444`) según `configUmbrales.verdeMax`/`ambarMax`
- ✅ Estructura del recuadro: `bg-white/90`, `rounded-lg`, `border`, `shadow-lg`, `backdrop-blur-sm`
- ✅ Barra de progreso: `h-1.5`, `rounded-full`, `transition-all duration-500`
- ✅ `Math.min(..., 100)` para no exceder el 100%
- ✅ Las transiciones de color siguen funcionando al cambiar umbrales o datos

## Cambios adicionales

- Se agregó `useMemo` para el cómputo (evita recalcular en cada render innecesario).
- Se cambió `toFixed(0)` → `toFixed(1)` para mostrar 1 decimal de precisión (al ser un promedio ponderado, el decimal aporta información útil).

## Impacto visual

```
ANTES (3 vistas):
┌─────────────────────┐
│ Ocupación máxima    │
│ 85% ██████████░░    │  ← era el % del nodo más ocupado (Math.max)
└─────────────────────┘

DESPUÉS (3 vistas):
┌─────────────────────┐
│ Ocupación global    │
│ 62.3% ██████░░░░░   │  ← ahora es (Σ ocup / Σ cap) × 100
└─────────────────────┘
```

## Prerrequisitos

- TypeScript compila sin errores nuevos (build exitoso).
- Sin cambios en backend, tipos, componentes, ni otros archivos fuera de `page.tsx`.
- Los umbrales de semáforo siguen siendo los mismos (`configUmbrales`).
- `useMemo` ya estaba importado globalmente en `page.tsx`.

---

---

# DISCUSION PENDIENTE: Regla de 1 hora de escala (virtual) + 15 min de recogida (virtual)

## Contexto de la discusión (06 jul 2026)

Discutimos la necesidad de implementar una regla de tiempo mínimo de escala para maletas en los aeropuertos intermedios durante la simulación, más un tiempo de recogida al llegar a destino final.

### ¿Qué cambió durante la discusión?

Originalmente la regla era **10 minutos simulados** en cada escala. Tras analizar las implicaciones técnicas en los motores de ruteo:

| Ítem | Antes | Después | Motivo |
|------|-------|---------|--------|
| Tiempo de escala | 10 min virtual | **1 hora virtual** | El ACO usa horas enteras (int 0-23) y refactorizar a minutos implicaba cambios riesgosos en el algoritmo de optimización por colonia de hormigas |
| GreedyRoutingStrategy | Había que cambiar MIN_CONEXION_MINUTOS de 60→10 | **No se toca** (ya tiene 60) | 1 hora ya es el valor actual ✅ |
| ACORoutingStrategy | Había que refactorizar de horas a minutos | **No se toca** (esperaV < 1 ya significa mínimo 1 hora) | Su granularidad en horas enteras es intencional para simplificar el cómputo ✅ |
| Entrega final (recogida) | No existía | **15 min virtuales** desde que la maleta aterriza en destino hasta que se marca ENTREGADO | La maleta ocupa almacén durante esos 15 min |

### Decisiones tomadas

1. **No tocar los motores de ruteo** (GreedyRoutingStrategy ni ACORoutingStrategy) — ya cumplen con mínimo 1 hora de conexión.
2. **Solo implementar en TickService.java** — los cambios van en la simulación, no en la planificación.
3. **Tracking en memoria** (no BD) — usar `ConcurrentHashMap<UUID, OffsetDateTime>` dentro de TickService para registrar cuándo llegó cada maleta a un aeropuerto. Sin migración Flyway.
4. **Ocupación de almacén durante los 15 min de recogida** — la maleta en EN_ALMACEN (destino final) sigue contando en la ocupación del nodo hasta que se marca ENTREGADO.
5. **Todo se documenta aquí para retomar después** — no se implementó nada aún.

### Lo que falta implementar

#### A) En `TickService.java` — estructura de datos en memoria

```java
// TickService.java — nuevos campos
private final ConcurrentHashMap<UUID, OffsetDateTime> llegadaEscala = new ConcurrentHashMap<>();
// UUID = equipaje.id, OffsetDateTime = horaVirtual de llegada al aeropuerto actual
```

#### B) En `procesarVuelosLlegada()` — registrar llegada de TODAS las maletas

Cuando una maleta llega a un aeropuerto (vuelo aterriza):

```java
// Al final del bucle de segmentos, para TODAS las maletas (intermedias y finales):
llegadaEscala.put(eq.getId(), vuelo.getHoraLlegada());
// Las intermedias ya se ponen EN_ALMACEN (sin cambios)
// Las finales: NO marcar ENTREGADO aún — se quedan EN_ALMACEN
//   y se registran en un Set<UUID> destinoFinal para el proceso de entrega
```

#### C) En `procesarVuelosSalida()` — validar 1 hora de escala

```java
// Para cada SegmentoPlan PENDIENTE con equipaje en EN_ALMACEN:
if (llegadaEscala.containsKey(eq.getId())) {
    OffsetDateTime llegada = llegadaEscala.get(eq.getId());
    if (llegada.plusHours(1).isAfter(virtual)) {
        // Maleta no ha esperado 1 hora — saltar este vuelo
        continue;  // Segmento sigue PENDIENTE, se reintenta en próximo tick
    }
}
```

#### D) Nuevo método `procesarEntregas()` — delay de 15 min en destino final

```java
private int procesarEntregas(SesionEjecucion sesion) {
    OffsetDateTime virtual = sesion.getDiaHoraVirtual();
    int entregadas = 0;
    for (UUID eqId : destinoFinal) {
        OffsetDateTime llegada = llegadaEscala.get(eqId);
        if (llegada != null && llegada.plusMinutes(15).isBefore(virtual)) {
            Equipaje eq = equipajeRepository.findById(eqId).orElse(null);
            if (eq != null && eq.getEstado() == EstadoEquipaje.EN_ALMACEN) {
                eq.setEstado(EstadoEquipaje.ENTREGADO);
                eq.setVueloActual(null);
                // Descontar de ocupación del nodo
                equipajesActualizar.add(eq);
                entregadas++;
            }
        }
    }
    return entregadas;
}
```

Llamar en `ejecutarTick()`:
```java
int entregas = procesarEntregas(sesion);
```

### Pregunta abierta (sin resolver)

> **¿Qué pasa cuando una maleta pierde su conexión por la regla de 1 hora?**

**Escenario:** Maleta llega al aeropuerto A a las 10:00 virtual. El vuelo de conexión A→B sale a las 10:30 (solo 30 min después). La maleta no puede abordar por la regla de 1 hora.

| Opción | Vuelo | Maleta | SegmentoPlan | Consecuencia |
|--------|-------|--------|-------------|--------------|
| **A) Vuelo sale sin maleta** | EN_RUTA | EN_ALMACEN | PENDIENTE (inconsistente) | Requiere replanificación automática — la maleta perdió su conexión |
| **B) Vuelo espera** | Sigue PROGRAMADO | EN_ALMACEN | PENDIENTE | El vuelo no despega en este tick; se reintenta en el próximo. La simulación se ralentiza pero no hay replanificación |

**No se decidió cuál implementar.** Queda pendiente para la próxima sesión.

### Archivos involucrados (para retomar)

| Archivo | Qué tocar |
|---------|-----------|
| `backend/.../bc2/application/TickService.java` | Agregar `llegadaEscala` + `destinoFinal` + validación 1h en `procesarVuelosSalida()` + nuevo `procesarEntregas()` + llamado en `ejecutarTick()` |
| `TareaEdViernes.md` | Documentar lo implementado |

### Lo que NO se toca

- `GreedyRoutingStrategy.java` (MIN_CONEXION_MINUTOS ya es 60 ✅)
- `ACORoutingStrategy.java` (mínimo 1 hora por diseño ✅)
- `Equipaje.java` (todo en memoria, sin migración)
- Migración Flyway (ninguna)
- Frontend (ningún cambio visual)
- `PlanViaje.java`, `SegmentoPlan.java` (sin cambios)

---

# Tarea: COLOR VACIO - Agregar color gris para ocupación 0% en aeropuertos

## Descripción

Agregar un color visual distinguible (gris `#9ca3af`) para los aeropuertos con ocupación exactamente **0%** (vacío), diferenciándolos de aquellos con ocupación baja pero no nula (que siguen en verde).

## Problema

- Un aeropuerto con 0% de ocupación se mostraba exactamente igual (verde `#22c55e`) que uno con 30% de ocupación.
- No era posible distinguir visualmente un aeropuerto vacío de uno con ocupación baja.
- El filtro de ocupación no tenía opción para filtrar específicamente aeropuertos vacíos.

## Archivos modificados

### 1. `frontend/lib/colors.ts`

| Cambio | Detalle |
|--------|---------|
| `COLOR_AEROPUERTO.VACIO` | Agregado `'#9ca3af'` (mismo gris que `COLOR_VUELO.VACIO`) |
| `ColorSemaforo` | Ampliado de `'VERDE' \| 'AMBAR' \| 'ROJO'` a `'VACIO' \| 'VERDE' \| 'AMBAR' \| 'ROJO'` |
| `determinarColorSemaforo(pct)` | Agregado early return: `if (pct <= 0) return 'VACIO'` |
| `colorAeropuertoPorOcupacion(pct)` | Agregado early return: `if (pct <= 0) return COLOR_AEROPUERTO.VACIO` |

### 2. `frontend/app/page.tsx`

| Cambio | Detalle |
|--------|---------|
| Botón en filtro | Agregado `'VACIO'` al array de opciones del filtro por ocupación |
| Círculo de color | Agregado `opt === 'VACIO'` → `'#9ca3af'` en el switch de colores del botón |

### 3. `frontend/lib/mock.ts`

| Cambio | Detalle |
|--------|---------|
| Línea 129 | `pct <= 0 ? COLOR_AEROPUERTO.VACIO :` agregado antes de la cadena de ternarias |

### 4. `frontend/components/mapa/GeoMapaVuelo.tsx`

| Cambio | Detalle |
|--------|---------|
| Línea 26 | `pct <= 0 ? COLOR_AEROPUERTO.VACIO :` agregado antes de la cadena de ternarias |

## Lo que se actualiza automáticamente

Los siguientes componentes ya usan `determinarColorSemaforo` o `colorAeropuertoPorOcupacion`, por lo que heredan el nuevo color `VACIO` sin cambios:

- `PanelAeropuertosOperacion.tsx` — filtro por color vía `determinarColorSemaforo`
- `PanelVuelosOperacion.tsx` — filtro por color vía `determinarColorSemaforo`
- `GeoMapa.tsx` — filtro de marcadores vía `determinarColorSemaforo`
- `page.tsx` — mapeo `/nodos` → `initialAeropuertos` vía `colorAeropuertoPorOcupacion` (3 `useEffect`s)

## Impacto visual

| Ocupación | Antes | Después | Hex |
|-----------|-------|---------|-----|
| 0% | Verde `#22c55e` | **Gris** `#9ca3af` | `🟤` |
| 1% – 69% | Verde `#22c55e` | Sin cambio | `🟢` |
| 70% – 89% | Ámbar `#eab308` | Sin cambio | `🟡` |
| 90%+ | Rojo `#ef4444` | Sin cambio | `🔴` |

## Prerrequisitos

- TypeScript compila sin errores nuevos.
- `COLOR_AEROPUERTO.VACIO` usa el mismo valor que `COLOR_VUELO.VACIO` (`#9ca3af`) para consistencia visual.
- Sin cambios en backend, `PanelTabs`, `GeoMapaLeyenda`, `ControlZoom`, ni otros componentes.

## Nota: filtro UI solo en OperacionView

El bloque "Filtro por Ocupación" (botones Todos/VACIO/VERDE/AMBAR/ROJO) solo existe en **OperacionView**. SimulacionView y ColapsoView no tienen este bloque — heredan el color VACIO en la representación visual (marcadores del mapa, paneles) pero no tienen la UI para filtrar activamente por color de ocupación. Para agregarlo en el futuro, replicar el bloque JSX de `page.tsx` (~línea 894) dentro del sidebar de cada vista.

---

# Tarea: QUITAR BOTON CANCELAR - Eliminar botón de cancelación del panel de vuelos

## Descripción

Eliminar el botón de cancelar vuelo (icono `XCircle`) que aparecía en cada tarjeta de vuelo del `PanelVuelosOperacion` para los estados `PROGRAMADO` y `EN_RUTA`.

## Problema

- El botón de cancelar vuelo ya no es necesario en el panel de vuelos de la vista Operación.
- Se conserva la funcionalidad subyacente (props `onCancelVuelo`, funciones `handleCancelarVuelo`) para un posible uso futuro.

## Archivo modificado

### `frontend/components/operacion/PanelVuelosOperacion.tsx`

| Cambio | Líneas | Detalle |
|--------|--------|---------|
| Eliminar botón cancelar | 332–340 (antes del cambio) | Bloque JSX con `onCancelVuelo && (estado === PROGRAMADO \|\| EN_RUTA) && <button>` |

**Código eliminado:**
```tsx
{onCancelVuelo && (v.estado === 'PROGRAMADO' || v.estado === 'EN_RUTA') && (
  <button
    onClick={e => { e.stopPropagation(); onCancelVuelo(v.id, v.codigo_vuelo); }}
    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors cursor-pointer"
    title="Cancelar vuelo"
  >
    <XCircle size={12} />
  </button>
)}
```

## Lo que NO se modificó

- `onCancelVuelo` prop en `PanelVuelosOperacionProps` — conservada
- `PanelTabs.tsx` — props y passthrough conservados
- `page.tsx` — `handleCancelarVuelo` y `onCancelVuelo={...}` conservados en las 3 vistas
- `frontend/lib/mock.ts`, `frontend/components/mapa/GeoMapaVuelo.tsx` — sin cambios
- Backend — sin cambios

## Prerrequisitos

- Build exitoso (TypeScript compila sin errores nuevos).

---

**¿Qué pendientes o mejoras futuras se identificaron?**
- **MetricasOperacion en SimulacionView y ColapsoView:** El componente `MetricasOperacion` (4 cards: Total/Entregados/EnVuelo/Replan) debía aparecer apilado sobre el panel de tiempos en `top-4 right-4` según el diseño de Actualización posterior 3, pero no se implementó. El panel derecho solo tiene el panel de tiempos sin MetricasOperacion.
- **Unificación de estilo MetricasOperacion:** `MetricasOperacion` usa `grid grid-cols-2` con cards internas; los chips de Simulación/Colapso usan diseño inline compacto. Si se desea uniformidad visual, refactorizar.
- **Flotantes no draggables:** Si se requiere reubicación dinámica por parte del usuario, implementar arrastre.
- **Atribución de Leaflet:** Se ocultó con `attributionControl={false}`. Si se requiere por licencia, agregar texto estático en esquina no conflictiva (ej. dentro de la Leyenda).
- **Precisión de coordenadas de aeropuertos:** Las coordenadas actuales son reales (WGS84). Verificar periódicamente contra fuentes oficiales si se agregan nuevos aeropuertos.
- **Pruebas automatizadas (frontend):** No existe infraestructura de tests unitarios ni de integración. Solo se ejecuta `next build` + `eslint` en CI. Agregar tests (Vitest, Playwright) para evitar regressiones visuales y de lógica.
- **TypeScript errors ignorados en build:** `next.config.ts` tiene `ignoreBuildErrors: true`. Si se requiere validación estricta de tipos en CI, cambiar a `false` y agregar script `typecheck` en package.json.
- **Refactor de time panels:** El JSX del panel de tiempos está duplicado en SimulacionView y ColapsoView. Extraer a un componente `<PanelTiempo>` compartido para evitar divergencia futura.

---

# Tarea: UMBRAL CANCELACION - Corregir límite de 1 hora para cancelación de vuelo

## Comentarios del cliente

> Una cancelación de vuelo, es la no disponibilidad de un vuelo concreto, inmediato siguiente a cuando se realizó la cancelación.
>
> Por ejemplo. Para el vuelo (imaginario) que sale de PQRS con destino a ABCD de las 18:25 horas en PQRS.
>
> 1. Si se cancela a las 13:30 (antes de la hora de inicio) entonces el vuelo de ese día PQRS-ABCD-18:25 se cancela por únicamente ese día. Es decir, no debe planificarse y en caso tenga maletas asignadas, deben quedar como disponibles para ser nuevamente planificadas.
> 2. Si se cancela a las 20:02 (después de la hora de inicio) entonces el vuelo del día siguiente de PQRS-ABCD-18:25 se cancela por únicamente ese día.
> 3. Para cancelar un vuelo el mismo día debe ser registrado hasta 1 hora antes. Para el caso sería:
>    a. Si cancela a las 17:25, entonces es una cancelación que aplica al mismo día.
>    b. Si cancela a las 17:26, entonces es una cancelación que aplica al día siguiente.

## Contexto / Problema detectado

El umbral que decide si una cancelación de plantilla aplica al vuelo de **hoy** (frío, con replanificación) o al de **mañana** (caliente, sin replanificación) era incorrecto en el borde exacto de 60 minutos.

**Comportamiento anterior (incorrecto):**
- `minutosHastaSalida > 60` → frío (hoy)
- `minutosHastaSalida <= 60` → caliente (mañana)

Esto provocaba que una cancelación registrada **exactamente a 1 hora** de la salida (ej. 17:25 para un vuelo de 18:25) se tratara como "caliente", cancelando el día siguiente en lugar del mismo día.

**Comportamiento corregido:**
- `minutosHastaSalida >= 60` → frío (hoy)
- `minutosHastaSalida < 60` → caliente (mañana)

Con el nuevo umbral, el cliente puede cancelar hasta el último minuto de la hora previa (incluyendo el minuto 60) y la cancelación aplica al mismo día.

## Archivos modificados

### 1. `backend/.../bc1/application/CancelacionService.java` (línea 253)

```java
// Antes:
if (minutosHastaSalida > 60) {
// Después:
if (minutosHastaSalida >= 60) {
```

### 2. `frontend/components/simulacion/SeccionCancelacion.tsx` (línea 203)

```typescript
// Antes:
const caliente = min !== null && min <= 60;
// Después:
const caliente = min !== null && min < 60;
```

Esto asegura que el botón muestre "Cancelar" (rojo) cuando faltan ≥60 min, y "→ Mañana" (ámbar) solo cuando faltan <60 min.

### 3. `frontend/lib/horasVirtuales.ts` (línea 52)

```typescript
// Antes:
return min !== null && min <= 60;
// Después:
return min !== null && min < 60;
```

Consistencia en el helper `esPlantillaCaliente` (aunque hoy no se usa en producción).

## Notas de implementación

- El único flujo activo de cancelación es el panel **"Cancelación (plantillas)"** (`SeccionCancelacion`). El callback `onCancelVuelo` en `PanelVuelosOperacion` es código muerto (nunca se renderiza un botón de cancelar ahí).
- La cancelación directa desde `handleCancelarVuelo` en `useSimulacionSesion.ts` y `page.tsx` no aplica la regla horaria porque el usuario selecciona explícitamente una instancia concreta.
- No se modificaron controladores, repositorios, ni la lógica de replanificación.

## Casos de borde verificados

| Tiempo virtual vs salida (18:25) | Diferencia (min) | Resultado esperado |
|---|---|---|
| 13:30 | +295 | **Hoy** — frío, replanifica |
| 17:25 | +60 | **Hoy** — frío, replanifica ✅ *(corregido)* |
| 17:26 | +59 | **Mañana** — caliente, sin replan |
| 18:25 | 0 | **Mañana** — caliente, sin replan |
| 20:02 | -97 | **Mañana** — caliente, sin replan |

---

# Anexo: Plan de pruebas de cancelación (v2 — refinado con requerimientos del cliente)

## Contexto

Una cancelación de vuelo es la no disponibilidad de un vuelo concreto, inmediato siguiente a cuando se realizó la cancelación. La regla de negocio para plantillas es:

- Si se cancela **≥ 60 minutos antes** de la salida → **Rama fría**: se cancela la instancia de **hoy**, se replanifican los equipajes afectados.
- Si se cancela **< 60 minutos antes** de la salida → **Rama caliente**: se cancela la instancia del **día siguiente**, sin replanificación, 0 equipajes afectados.

Tanto backend como frontend ya tienen el umbral corregido (`>= 60` / `< 60`).

---

## 1. Mecanismos de cancelación en el sistema

### A. Cancelación automática (probabilística — TickService)
- Se ejecuta cada tick (~5s reales) dentro de `TickService.evaluarCancelaciones()`.
- Evalúa vuelos `PROGRAMADO` cuya salida cae en la siguiente ventana virtual (próximos 10 min con k=120).
- Por cada vuelo, lanza `Random.nextDouble() < prob_cancelacion`.
- **No usa el umbral de 1 hora.** Es puramente aleatorio.
- Se configura con `prob_cancelacion` al crear la sesión (0.0 = desactivado).

### B. Cancelación manual (vía plantillas — SeccionCancelacion) ← **ÚNICO FLUJO ACTIVO**
- Dock izquierdo Simulación/Colapso → ícono `XCircle` → tabla de plantillas.
- Cada fila: botón **"Cancelar"** (rojo, rama fría, `≥60 min`) o **"→ Mañana"** (ámbar, rama caliente, `<60 min`).
- Envía `POST /api/simulacion/cancelacion` con `aplicar_regla_plantilla: true`.

### C. Cancelación directa (código muerto)
- `PanelVuelosOperacion.tsx` acepta `onCancelVuelo` pero **nunca renderiza botón de cancelar**. No se usa en producción.

---

## 2. Vuelos plantilla desde Perú/Colombia en ventana 16:00-23:00 UTC

| Vuelo | Origen | Destino | Salida UTC | Llegada UTC | Prioridad |
|---|---|---|---|---|---|
| **TAS0024** | **SPIM (Lima)** | SKBO (Bogotá) | **18:09** | 20:25 | 🥇 Perú |
| TAS0208 | **SPIM (Lima)** | SEQM (Quito) | 17:11 | 18:52 | 🥇 Perú |
| TAS0210 | **SPIM (Lima)** | SEQM (Quito) | 21:09 | 22:50 | 🥇 Perú |
| TAS0005 | SKBO (Bogotá) | SEQM (Quito) | 19:01 | 19:48 | 🥈 Colombia |
| TAS0011 | SKBO (Bogotá) | SVMI (Caracas) | 19:18 | 21:41 | 🥈 Colombia |
| TAS0017 | SKBO (Bogotá) | SBBR (Brasilia) | 20:22 | 02:57+1 | 🥈 Colombia |
| TAS0023 | SKBO (Bogotá) | SPIM (Lima) | 22:45 | 01:01+1 | 🥈 Colombia |
| TAS0047 | SKBO (Bogotá) | SGAS (Asunción) | 17:38 | 23:18 | 🥈 Colombia |
| TAS0033 | SKBO (Bogotá) | SCEL (Santiago) | 19:18 | 02:30+1 | 🥈 Colombia |

**Vuelo recomendado:** TAS0024 (SPIM Lima → SKBO Bogotá, 18:09 UTC) — Perú como primera opción, continental Sudamérica.

---

## 3. Factor de tiempo (k) y duración de la simulación

| k | Min virtuales / tick (5s reales) | Duración real 5D | Adecuado para prueba |
|---|---|---|---|
| 60 | 5 min | ~120 min | ✅ Mucho tiempo |
| **120** (default) | **10 min** | **~60 min** | ✅ Tiempo suficiente |
| **240** | **20 min** | **~30 min** | ✅ Mínimo aceptable (cliente: "al menos 30 min") |

Fórmula: `virtualMinutos_por_tick = k / 12`

Se recomienda **k=120** para tener ~60 min reales y poder observar con calma. Si se requiere acortar a ~30 min, usar **k=240**.

---

## 4. Procedimiento de prueba completo

### Prerrequisitos

| Ítem | Valor | Nota |
|---|---|---|
| Vuelo objetivo | **TAS0024** (SPIM→SKBO, 18:09 UTC) | Primera opción: Perú |
| k | **120** (default) | ~60 min reales para 5D |
| `prob_cancelacion` | **0.0** | Solo cancelación manual |
| Sesión inicia | **2026-07-15 02:00 UTC** | ~16h antes de TAS0024 |
| Nodo para equipajes | **SPIM (Lima)** | Mismo origen que el vuelo |
| Destino equipajes | **SKBO (Bogotá)** | Mismo destino que el vuelo |

### Timeline estimado (k=120)

| Tiempo real | Tiempo virtual | Acción |
|---|---|---|
| T+0:00 | 02:00 | Crear sesión e **iniciar** |
| T+0:00–48:00 | 02:00–14:00 | Avance rápido (~10min/tick) |
| T+**~48min** | **~14:00** | ⏸️ **PAUSAR** simulación |
| T+~48min | ~14:00 | Crear **≥2 equipajes** SPIM→SKBO (de distintos envíos) |
| T+~49min | ~14:00 | ▶️ **Reanudar**, esperar ruteo asíncrono (~30s reales) |
| T+~52min | ~15:00 | **Verificar** asignación a TAS0024 |
| T+~60min | **~17:09** | ⏸️ **PAUSAR** y cancelar TAS0024 (60min antes → frío ✅) |
| T+~60min | ~17:09 | Verificar modal verde con equipajes afectados |
| T+~62min | ~17:30 | ▶️ Reanudar, esperar replanificación |
| T+~63min | ~17:40 | ✅ **Acción 5b**: verificar equipajes reasignados (panel Envíos) |
| T+~65min | **~18:09+** | ✅ **Acción 5a**: verificar TAS0024 NO despega (mapa + panel) |
| T+~70min | ~19:00+ | Opcional: descargar PDF del lote de replanificación |

### Paso a paso detallado

#### Fase 0: Identificar el vuelo en el sistema
```bash
# 0.1 Listar nodos/aeropuertos
GET /api/nodos
# Buscar SPIM (Lima) y anotar su UUID

# 0.2 Buscar plantilla TAS0024
GET /api/vuelos?es_plantilla=true&size=500
# Filtrar TAS0024, anotar su UUID y hora_salida (18:09 UTC)
```

#### Fase 1: Crear e iniciar sesión de simulación
```json
POST /api/sesiones
{
  "tipo": "SIMULADA",
  "fecha_inicio_virtual": "2026-07-15",
  "hora_inicio_virtual": "02:00",
  "prob_cancelacion": 0.0,
  "k": 120,
  "tipo_simulacion": "VENTANA_FIJA",
  "duracion_dias": 5
}
→ Anotar sesion_id

POST /api/sesiones/{sesion_id}/iniciar
```

#### Fase 2: Crear equipajes (≥2 de DISTINTOS envíos)
```bash
# Envío 1
POST /api/equipajes
Headers: { "X-Device-Nodo-Id": "<uuid-de-SPIM>" }
Body: { "destino_iata": "SKBO", "cantidad": 1 }

# Envío 2 (repetir para tener un segundo envío independiente)
POST /api/equipajes
Headers: { "X-Device-Nodo-Id": "<uuid-de-SPIM>" }
Body: { "destino_iata": "SKBO", "cantidad": 1 }
```
> **Importante:** Crear los equipajes como **envíos separados** (2 llamadas distintas) para tener IDs y seguimiento independientes. Pausar la simulación antes de crearlos.

#### Fase 3: Verificar asignación a TAS0024
```bash
GET /api/equipajes?vuelo_id=<uuid-de-TAS0024>
# Debe devolver los equipajes creados con estado ENRUTADO
```
> En UI: Panel Envíos → pestaña "Planificados" muestra cada maleta con el código del vuelo asignado.

#### Fase 4: Cancelar TAS0024 (cuando el reloj virtual marque ~17:09)
1. ⏸️ Pausar la simulación
2. En Simulación, dock izquierdo → ícono Cancelación (XCircle)
3. Buscar **TAS0024** en la tabla
4. **Verificar botón**: debe mostrar **"Cancelar"** (rojo) — estamos a 60min exactos, rama fría
5. Hacer clic
6. **Verificar modal de resultado**:
   - Título verde: "Cancelación aplicada al vuelo de hoy"
   - `equipajes_afectados` > 0 (deben ser los 2+ creados)
   - Aparece botón "Descargar PDF" (lote de replanificación)

#### Fase 5: Verificación post-cancelación (OBLIGATORIO: ambas acciones)

> **Orden flexible** según conveniencia de la simulación, pero **ambas deben ejecutarse sí o sí**.

##### Acción 5a — Verificar que TAS0024 NO despega
- ▶️ Reanudar la simulación
- Avanzar hasta que el reloj virtual supere las **18:09**
- Observar en el mapa: el avión de TAS0024 **no debe moverse** de SPIM (Lima)
- En el panel de vuelos: estado debe ser **`CANCELADO`**
- Confirmar que ningún vuelo con código TAS0024 está en `EN_RUTA`

##### Acción 5b — Verificar que los equipajes fueron reasignados
- Panel Envíos → pestaña "Planificados"
- Cada maleta debe mostrar un **código de vuelo DIFERENTE** a TAS0024
- Opcional: consultar plan de viaje individual:
  ```bash
  GET /api/equipajes/{id}/plan-viaje
  # Debe mostrar un nuevo segmento con vuelo distinto
  ```
- Opcional: descargar PDF del lote:
  ```bash
  GET /api/sesiones/{sesion_id}/replanificaciones/{lote_id}/pdf
  ```

### Block de notas template

```
=== FASE 0: IDENTIFICAR VUELO ===
Vuelo objetivo: _____________ (ej: TAS0024)
Ruta: _____________ → _____________ (ej: SPIM → SKBO)
Hora salida UTC: _____________ (ej: 18:09)
UUID del vuelo: _____________
UUID del nodo SPIM: _____________

=== FASE 1: CREAR SESIÓN ===
Sesion ID: _____________
Inicio virtual: 2026-07-15 02:00
k: _____________ (120)
prob_cancelacion: _____________ (0.0)

=== FASE 2: CREAR EQUIPAJES ===
Envío 1 - ID: _____________ | Código: _____________ | Cant: _____
Envío 2 - ID: _____________ | Código: _____________ | Cant: _____

=== FASE 3: VERIFICAR ASIGNACIÓN ===
Hora virtual al verificar: _____________
¿Eq1 asignado a TAS0024? [Sí / No]
¿Eq2 asignado a TAS0024? [Sí / No]

=== FASE 4: CANCELAR ===
Hora virtual al pausar: _____________
minutosHastaSalida: _____________ (>60 → frío)
Botón mostrado: [Cancelar / → Mañana]
Modal - Título: ____________________________________
Modal - Color: [Verde / Ámbar]
Equipajes afectados: _____
Lote replan ID: _____________
PDF descargado?: [Sí / No]

=== FASE 5a: VUELO NO DESPEGA ===
Hora virtual ~18:09: TAS0024 despegó? [Sí / No]
Estado en panel de vuelos: [CANCELADO / EN_RUTA / PROGRAMADO]
Avión visible en mapa en SPIM?: [Sí / No]

=== FASE 5b: EQUIPAJES REASIGNADOS ===
Nuevo vuelo de Eq1: _____________
Nuevo vuelo de Eq2: _____________
¿Eq1 y Eq2 están en vuelos diferentes a TAS0024? [Sí / No]
Plan de viaje consultado?: [Sí / No]
```

---

## 5. Prueba de rama caliente (opcional)

Repetir el procedimiento pero esperar a que el reloj virtual esté dentro de la ventana **<60 min** antes de la salida (virtual entre **17:10 y 18:09**, o después de 18:09):

- El botón debe mostrar **"→ Mañana"** (ámbar)
- Modal ámbar: "Cancelación diferida al día siguiente"
- **0 equipajes afectados**
- La instancia de **hoy** de TAS0024 despega normalmente
- La instancia de **mañana** aparece CANCELADA

---

## 6. Notas técnicas importantes

| Aspecto | Detalle |
|---|---|
| Creación de equipajes | Solo hay UI en **Operación** (dock "Registro Equipaje"). En Simulación no hay formulario; usar API directamente. |
| Verificación visual | Confirmar que un vuelo "no despega" es visual (avión no se mueve). No hay indicador programático adicional. |
| Ruteo asíncrono | El `MotorEnrutamiento` tarda hasta ~30s (configurable, `sa_segundos`). Esperar después de crear equipajes. |
| k=240 | Para acortar a ~30 min en lugar de ~60 min. Cada tick = 20 min virtuales. |
| Prueba de humo rápida | Crear sesión con `fecha_inicio_virtual=2026-07-15T17:00` y cancelar inmediatamente TAS0024. Caería en rama fría por 69 min de margen. |
| Código muerto | `onCancelVuelo` en `PanelVuelosOperacion` nunca se renderiza. Si se necesita cancelar desde panel de vuelos, implementar botón. |
