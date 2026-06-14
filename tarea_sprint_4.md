# Sprint 4 — Mejoras Vista de Simulación

> **Objetivo:** Implementar mejoras en la vista de simulación en vivo (`/simulacion/[id]`): paneles colapsables, indicadores visuales de capacidad/ocupación, línea curva de vuelos, filtros, ordenamiento y visualización de envíos.
>
> **Duración:** 4 días (jueves a lunes)
>
> **Equipo:**
> - **Developer 1 — Eduardo** (jueves y viernes)
> - **Developer 2 — Josue** (domingo y lunes)

---

## Backend — Cambios compartidos (previo a cualquier frontend)

| # | Tarea | Prioridad | Descripción |
|---|-------|-----------|-------------|
| B1 | ✅ Agregar `fecha_inicio_real` a `MetricasSesionResponse` | **Alta** | `MetricasSesionResponse`, `TickService.buildMetricasJson()` y `SesionService.obtenerMetricas()` actualizados — backend compila OK. |
| B2 | Endpoint `GET /api/sesiones/{id}/envios/vuelo/{vueloId}` | **Alta** | Devuelve los equipajes actualmente asignados a un vuelo (origen, destino, código, cantidad). Requerido para tarea 13. |
| B3 | Endpoint `GET /api/sesiones/{id}/envios/nodo/{nodoIata}` | **Alta** | Devuelve los equipajes actualmente almacenados en un nodo. Requerido para tarea 13. |
| B4 | Endpoint `GET /api/sesiones/{id}/envios/entregados-recientes?horas=4` | **Alta** | Devuelve equipajes con estado `ENTREGADO` en las últimas N horas virtuales. Requerido para tarea 14. |

> **Nota:** Los endpoints B2-B4 deben integrarse con el motor de simulación para reflejar el estado virtual actual (no el real de la BD).

---

## Developer 1 — Eduardo (jueves y viernes)

### Grupo A — Infraestructura UI y Visualización del Mapa

| # | Tarea | Archivos principales | Descripción técnica |
|---|-------|----------------------|---------------------|
| **1** | ✅ Sidebar colapsable | `frontend/app/simulacion/[id]/page.tsx` | Sidebar `w-80`/`w-12` con toggle Menu/ChevronLeft, animación `transition-all duration-300`, badge estado + telemetría al colapsar. |
| **2** | ✅ Nodos: color según ocupación del almacén | `frontend/components/mapa/GeoMapaNodo.tsx` | Verificado: `GeoMapaNodo.tsx` ya usa `nodo.color` del backend (verde/ámbar/rojo según ocupación). |
| **3** | ✅ Vuelos: Popup de capacidad al hacer clic | `frontend/components/mapa/GeoMapaVuelo.tsx`, `AvionAnimado.tsx` | Popup Leaflet en `AvionAnimado.tsx` con código vuelo, origen→destino, capacidad, ocupado, badge % con fondo verde/ámbar/rojo. |
| **4** | ✅ Mostrar fecha/hora REAL de inicio | `MetricasSesionResponse.java` (backend), `page.tsx` | Card "Inicio real" muestra `fecha_inicio_real` en formato `DD/MM/AAAA HH:mm:ss`. Null cuando CONFIGURADA. Depende de B1. |
| **5** | ✅ Mostrar fecha/hora REAL actual (congela al finalizar) | `frontend/app/simulacion/[id]/page.tsx` | Card calculada como `fechaInicioReal + segundosRealesTranscurridos`. Se congela vía `ultimaFechaRealRef` al detectar estado `FINALIZADA`. |
| **6** | ✅ Mostrar fecha/hora VIRTUAL de inicio | `frontend/app/simulacion/[id]/page.tsx` | Card "Inicio virtual" lee `fecha_inicio_virtual` y `hora_inicio_virtual` de `searchParams` de la URL. |
| **7** | ✅ Mostrar fecha/hora VIRTUAL actual (congela al finalizar) | `frontend/app/simulacion/[id]/page.tsx` | Card "Virtual actual" muestra `dia_hora_virtual` congelado vía `ultimoVirtualRef` al llegar a `FINALIZADA`. |
| **8** | ✅ Líneas curvas en rutas de vuelo | `frontend/components/mapa/GeoMapaVuelo.tsx` | Función `calcularCurvaBezier()` con offset perpendicular proporcional a distancia y 50 puntos de interpolación. Reemplazado `Polyline` recto por curva bezier. |

---

## Developer 2 — Josue (domingo y lunes)

### Grupo B — Paneles, Filtros, Ordenamiento y Envíos

| # | Tarea | Archivos principales | Descripción técnica |
|---|-------|----------------------|---------------------|
| **9** | Filtro vuelos: código, origen, destino | `frontend/app/simulacion/[id]/page.tsx` (o nuevo componente `PanelVuelos`) | Agregar inputs de texto/select en el panel de vuelos para filtrar por `codigo_vuelo`, `origen_iata`, `destino_iata`. Filtrar la lista del `ResumenVuelos` o crear un panel dedicado. |
| **10** | Ordenamiento vuelos: ocupación, salida, llegada, origen, destino | `frontend/app/simulacion/[id]/page.tsx` | Agregar dropdown/select de ordenamiento en el panel de vuelos. Opciones: ocupación (asc/desc), hora salida, hora llegada, origen (A-Z), destino (A-Z). |
| **11** | Filtro nodos: código, continente | Nuevo componente `PanelNodos` | Agregar inputs de texto/select en panel de nodos para filtrar por `codigo_iata` y `continente` (si existe el dato; si no, por zona_horaria como proxy de continente). |
| **12** | Ordenamiento nodos: ocupación, salida UT, llegada UT | Nuevo componente `PanelNodos` | Dropdown de ordenamiento para nodos: ocupación (asc/desc), hora de salida de UT desde el nodo, hora de llegada de UT al nodo. Requiere datos de temporización. |
| **13** | Click nodo/vuelo → mostrar envíos | Nuevo componente `PanelEnvios` | Al hacer clic en un nodo o vuelo del panel respectivo, mostrar un subpanel/drawer/modal con los envíos actuales. Mostrar: origen, destino, código de equipaje, cantidad de maletas. Consumir endpoints B2 y B3. |
| **14** | Panel últimos envíos entregados (4h) | Nuevo componente `PanelEntregados` | Mostrar listado de equipajes con estado `ENTREGADO` en las últimas 4 horas virtuales. Columnas: origen, destino, UT (código vuelo), cantidad de maletas. Consumir endpoint B4. |
| **15** | Filtrar vuelos en mapa por origen y destino | `GeoMapa.tsx`, `page.tsx` | Pasar props de filtro desde los inputs de filtro del panel de vuelos (tarea 9) al componente `GeoMapa` para que solo renderice los vuelos que coinciden con origen y/o destino seleccionados. |

---

## Dependencias entre tareas

```
Inicio
 ├── B1 (fecha_inicio_real en DTO) → T4, T5
 ├── B2 (endpoint envíos vuelo) → T13
 ├── B3 (endpoint envíos nodo) → T13
 ├── B4 (endpoint entregados) → T14
 │
 ├── Eduardo (Jue-Vie)
 │   ├── T1 (sidebar colapsable) → [base para nuevo layout]
 │   ├── T2 (colores nodo)
 │   ├── T3 (popup capacidad vuelo)
 │   ├── T4 (fecha real inicio) → depende de B1
 │   ├── T5 (fecha real actual) → depende de T4
 │   ├── T6 (fecha virtual inicio)
 │   ├── T7 (fecha virtual actual)
 │   └── T8 (líneas curvas)
 │
 └── Josue (Dom-Lun)
     ├── T9 (filtro vuelos) → T15
     ├── T10 (ordenamiento vuelos)
     ├── T11 (filtro nodos)
     ├── T12 (ordenamiento nodos)
     ├── T13 (envíos click panel) → depende de B2, B3
     ├── T14 (panel entregados) → depende de B4
     └── T15 (filtro vuelos mapa) → depende de T9
```

---

## Notas adicionales

- **Los endpoints B2-B4** pueden ser implementados por cualquiera de los dos developers o de forma compartida al inicio. Se recomienda que Josue los implemente junto con las tareas 13-14, o que se hagan como precarga antes del domingo.
- **Mock data:** Mientras los endpoints B2-B4 no estén listos, usar datos mock en el frontend para poder desarrollar y probar T13 y T14 en paralelo.
- **Commit convention:** `feat:`, `fix:`, `refactor:` según corresponda.
- **Branch:** `frontend/sprint4-simulacion-mejoras` desde `main`.
