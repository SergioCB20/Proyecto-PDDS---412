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
| B1 | Agregar `fecha_inicio_real` a `MetricasSesionResponse` | **Alta** | Actualmente la entidad `SesionEjecucion` tiene `fechaInicioReal` pero el DTO de métricas no lo expone. Añadirlo para que el frontend pueda mostrar la fecha/hora real de inicio. |
| B2 | Endpoint `GET /api/sesiones/{id}/envios/vuelo/{vueloId}` | **Alta** | Devuelve los equipajes actualmente asignados a un vuelo (origen, destino, código, cantidad). Requerido para tarea 13. |
| B3 | Endpoint `GET /api/sesiones/{id}/envios/nodo/{nodoIata}` | **Alta** | Devuelve los equipajes actualmente almacenados en un nodo. Requerido para tarea 13. |
| B4 | Endpoint `GET /api/sesiones/{id}/envios/entregados-recientes?horas=4` | **Alta** | Devuelve equipajes con estado `ENTREGADO` en las últimas N horas virtuales. Requerido para tarea 14. |

> **Nota:** Los endpoints B2-B4 deben integrarse con el motor de simulación para reflejar el estado virtual actual (no el real de la BD).

---

## Developer 1 — Eduardo (jueves y viernes)

### Grupo A — Infraestructura UI y Visualización del Mapa

| # | Tarea | Archivos principales | Descripción técnica |
|---|-------|----------------------|---------------------|
| **1** | Sidebar colapsable | `frontend/app/simulacion/[id]/page.tsx` | Convertir el panel derecho (`w-80`) en un sidebar colapsable con botón de toggle (ícono menú/chevron). Al colapsar, solo mostrar una pestaña angosta con indicadores mínimos. |
| **2** | Nodos: color según ocupación del almacén | `frontend/components/mapa/GeoMapaNodo.tsx` | El backend ya envía `color` y `ocupacion_pct` vía telemetría. Verificar que el `CircleMarker` use correctamente el color (verde < 70%, ámbar 70-90%, rojo > 90%) y se actualice en vivo. |
| **3** | Vuelos: color según capacidad al hacer clic | `frontend/components/mapa/GeoMapaVuelo.tsx` | `VueloTelemetria` ya tiene `color` y `ocupacion_pct`. Agregar `Popup` de Leaflet al `AvionAnimado` o `Marker` que muestre: código, ocupación %, capacidad, con color de fondo verde/ámbar/rojo. |
| **4** | Mostrar fecha/hora REAL de inicio | `MetricasSesionResponse.java` (backend), `page.tsx` | Usar el nuevo campo `fecha_inicio_real` del backend (tarea B1). Si no está disponible, calcularlo client-side al hacer clic en "Iniciar". Mostrar en formato `DD/MM/AAAA HH:mm:ss`. |
| **5** | Mostrar fecha/hora REAL actual (detener al finalizar) | `frontend/app/simulacion/[id]/page.tsx` | Actualmente se muestran solo segundos transcurridos. Cambiar a mostrar fecha+hora real completa calculada como `fechaInicioReal + segundosRealesTranscurridos`. Debe detenerse cuando la sesión pase a `FINALIZADA`. |
| **6** | Mostrar fecha/hora VIRTUAL de inicio | `frontend/app/simulacion/[id]/page.tsx` | Leer `fecha_inicio_virtual` y `hora_inicio_virtual` de los `searchParams` de la URL. Mostrar en formato legible. |
| **7** | Mostrar fecha/hora VIRTUAL actual (detener al finalizar) | `frontend/app/simulacion/[id]/page.tsx` | Ya se muestra `dia_hora_virtual` de las métricas. Verificar que al llegar a `FINALIZADA` el valor se congele (no siga mostrando polling vacío). |
| **8** | Líneas curvas en rutas de vuelo | `frontend/components/mapa/GeoMapaVuelo.tsx` | Reemplazar `Polyline` de Leaflet (línea recta) por una curva bezier o arco entre origen y destino. Usar `leaflet-curve` o calcular interpolación con `L.curve` o similar. Alternativa: librería `leaflet-arc`. |

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
