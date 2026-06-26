# Tarea: ADD SIMULACION Y OPERACION - Agregar color para vacío

## Descripción

Agregar un color visual distinguible para el estado "vacío" (desconocido, nulo o no manejado) de los vuelos en las vistas de **Simulación** y **Operación**, unificando la lógica de color en una función centralizada.

## Problema detectado

- El color gris `#6b7280` se usaba indistintamente para `COMPLETADO` y como *fallback* para estados desconocidos, impidiendo diferenciarlos visualmente.
- `PanelVuelos.tsx` (simulación) no manejaba el estado `CANCELADO`, cayendo silenciosamente al mismo gris de `COMPLETADO`.
- Los colores de estado de vuelo estaban duplicados como `Record` local en `GeoMapaVuelo.tsx` y `AvionAnimado.tsx`, y como cadenas hex hardcodeadas en los paneles `PanelVuelos.tsx` y `PanelVuelosOperacion.tsx`.

## Archivos modificados

### 1. `frontend/lib/colors.ts`

- Agregada clave `VACIO: '#9ca3af'` al objeto `COLOR_VUELO`.
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
COLOR_VUELO.VACIO = '#9ca3af'  // Tailwind gray-400

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

### Contexto completo de la tercera actividad (para reanudar en futuros chats)

**¿Qué se implementó?**
Se agregó una tercera pestaña "Colapso" en el dashboard principal (`frontend/app/page.tsx`), al mismo nivel que "Operación" y "Simulación". Es una vista SPA (no una ruta independiente) que permite ejecutar simulaciones en modo `HASTA_COLAPSO`.

**¿Dónde está el código?**
- `frontend/lib/types.ts` — línea 96: se agregó `'COLAPSADA'` al tipo `MetricasSimulacion.estado`.
- `frontend/app/page.tsx` — el componente `<ColapsoView>` comienza aprox. en la línea 845 (después de `SimulacionView`).

**¿Qué diferencia a ColapsoView de SimulacionView?**
1. Envía `tipo_simulacion: 'HASTA_COLAPSO'` al crear la sesión (vs. `VENTANA_FIJA` por defecto).
2. El estado `estadoSesion` incluye `'COLAPSADA'`.
3. El polling de métricas detecta `estado === 'COLAPSADA'` y automáticamente inicia `fetchReportWithRetry()` para obtener el reporte (reintentos cada 600ms, hasta 10 intentos).
4. Muestra una barra de "Ocupación máxima" con semáforo de colores (verde/ámbar/rojo) según los umbrales configurados.
5. Cuando ocurre colapso: banner rojo "Generando reporte de colapso..." → `PanelReporte`.
6. Cuando el usuario detiene manualmente: banner gris "Generando reporte..." → `PanelReporte`.
7. La configuración incluye un badge ámbar "Modo: HASTA COLAPSO" con descripción.

**¿Qué NO se modificó?**
- Backend: sin cambios.
- `OperacionView`: sin cambios.
- `SimulacionView`: sin cambios (excepto el tipo `MetricasSimulacion.estado` compartido).
- `PanelReporte`: sin cambios (ya renderiza colapso correctamente).
- Componentes de mapa, paneles de aeropuertos/vuelos/envíos/entregas: sin cambios.

**¿Qué pendientes o mejoras futuras se identificaron?**
- Si se desea, se puede convertir en una ruta independiente (ej. `/colapso`) usando App Router, pero por ahora es una pestaña dentro del SPA.
- El backend tiene el campo `nodo_colapso_ref_id` en `ReporteSesion` pero no lo popula actualmente — sería útil en el futuro para identificar qué nodo causó el colapso.
- La vista no tiene un indicador por nodo individual de ocupación; solo muestra la ocupación máxima global. Se podría agregar una lista de nodos con su ocupación individual.

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

### Técnica

```tsx
// Mismo patrón que GeoMapaLeyenda
<div className="absolute top-4 left-4 z-[1001] pointer-events-none">
  <div className="pointer-events-auto ...">
    {/* métricas */}
  </div>
</div>
```

- `absolute` dentro del contenedor `relative` del mapa
- `z-[1001]` para estar sobre la leyenda (`z-[1000]`)
- `pointer-events-none` en el contenedor, `pointer-events-auto` en el panel (no bloquea interacción con el mapa)
- Fondo `bg-white/85 dark:bg-slate-900/85` con `backdrop-blur-sm` para ser semitransparente y no tapar el mapa
- Solo visibles cuando `estadoSesion === 'EN_CURSO' || estadoSesion === 'PAUSADA'`

### Impacto visual

| Antes | Después |
|---|---|
| Métricas y tiempos ocupan ~250px verticales en el sidebar | Métricas: ~55px semitransparente en top-left del mapa |
| Al colapsar sidebar, métricas no visibles | Tiempos: ~80px semitransparente en bottom-left del mapa |
| Sidebar muy cargado de información | Siempre visibles, no dependen del estado del sidebar |
| — | No interfieren con la interacción del mapa (pointer-events) |

## Prerrequisitos

- TypeScript compila sin errores.
- ESLint sin warnings/errors.
- La función local `MetricaCard` fue eliminada por quedar sin uso.
- Sin cambios en backend, componentes importados (`MetricasOperacion`, `ResumenVuelosOperacion`, `GeoMapa`, etc.) ni tipos.

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

### Contexto completo de la cuarta actividad (para reanudar en futuros chats)

**¿Qué se implementó?**
Se movieron las métricas (SLA, Cancelaciones, Replanificadas) y la información de tiempo (Tiempo Virtual, Inicio Real, Inicio Virtual, Transcurrido Real) desde el panel lateral hacia el mapa como elementos flotantes semitransparentes, siguiendo el mismo patrón visual de `GeoMapaLeyenda`. Aplica a las tres vistas: Operación, Simulación y Colapso. Posteriormente se corrigió el recuadro visual de todos los flotantes para que coincidiera exactamente con el estilo de Leyenda (`bg-white/90`, `rounded-lg`, `border`, `shadow-lg`) y se ocultó la atribución de Leaflet que solapaba con el flotante de tiempos.

**¿Dónde está el código?**

- `frontend/app/page.tsx`:
  - **OperacionView** (~línea 352): `<MetricasOperacion />` flotando en `absolute top-4 left-4` dentro de un wrapper con el mismo recuadro que Leyenda.
  - **SimulacionView** (~líneas 689–731): Flotante top-left con 3 chips compactos (SLA, Cancel, Replan) + flotante bottom-left con Tiempo Virtual, Inicio Real, Inicio Virtual, Transcurrido. Solo visibles cuando `estadoSesion === 'EN_CURSO' || estadoSesion === 'PAUSADA'`.
  - **ColapsoView** (~líneas 1052–1108): Ídem SimulacionView + barra de Ocupación máxima con semáforo (verde/ámbar/rojo) en el flotante top-left.
- `frontend/components/operacion/MetricasOperacion.tsx` (~línea 65): Eliminado `border-t` residual del contenedor principal.
- `frontend/components/mapa/GeoMapa.tsx` (~línea 43): Agregado `attributionControl={false}` para ocultar la atribución de Leaflet.

**Diseño de los flotantes:**

```
┌──────────────────────────────────────────┐  ← top-4 left-4 (16px del borde)
│ [SLA 85%] [Cancel 3] [Replan 12]         │  ← bg-white/90 backdrop-blur, rounded-lg, border, shadow
│ ┌─ Ocupación máxima ──── 82% ─┐          │  ← solo ColapsoView
│ │ ████████████████░░░░░░░░░   │          │
│ └─────────────────────────────┘          │
└──────────────────────────────────────────┘

┌─────────────────────────────┐  ← bottom-4 left-4 (16px del borde)
│ 🕐 2025-06-03 14:30         │  ← bg-white/90 backdrop-blur, rounded-lg, border, shadow
│ Inicio Real: 2025-06-01     │
│ Inicio Virtual: 08:00       │
│ Transcurrido: 2h 30m 15s    │
└─────────────────────────────┘
```

**Estilo de recuadro (unificado con Leyenda):**
```
bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg
```

**¿Qué NO se modificó?**
- Backend: sin cambios.
- `GeoMapaLeyenda.tsx`: sin cambios.
- `PanelReporte`: sin cambios.
- Tipos (`lib/types.ts`): sin cambios.
- Componentes de mapa (`GeoMapaVuelo`, `GeoMapaAeropuerto`, `AvionAnimado`): sin cambios.
- Paneles del sidebar (`PanelVuelos`, `PanelVuelosOperacion`, `PanelAeropuertos`, `PanelEnvios`, `PanelEntregados`, `ResumenVuelosOperacion`): sin cambios.
- Funcionalidad de las vistas: sin cambios (solo se movió la presentación de métricas/tiempos al mapa).

**¿Qué pendientes o mejoras futuras se identificaron?**
- El componente `MetricasOperacion` tiene su propio layout interno (`grid grid-cols-2`, `p-4`) que difiere del estilo compacto de chips usado en Simulación y Colapso. Si se desea uniformidad total, se podría refactorizar para que use el mismo patrón de chips.
- Los flotantes no son draggables — si en el futuro se requiere reubicación dinámica, habría que implementar arrastre.
- La atribución de Leaflet se ocultó completamente; si se requiere por licencia, se podría agregar como texto estático en una esquina no conflictiva (ej. dentro de la Leyenda).
