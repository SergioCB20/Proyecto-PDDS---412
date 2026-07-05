## Context

El panel de envíos ya tiene un botón por fila (task anterior, `seguir-maleta-en-mapa-panel-envios`) que consulta `GET /equipajes/{id}/plan-viaje` y activa el seguimiento del vuelo actual de una maleta. Sin embargo, un grupo de maletas (`codigo_equipaje`) puede viajar a través de múltiples segmentos de vuelo según su plan de viaje. Actualmente no hay forma de visualizar todos esos segmentos simultáneamente en el mapa.

El mapa Leaflet (`GeoMapa`) ya renderiza vuelos como polylines curvas (bezier) entre aeropuertos mediante `AvionAnimado`, y las rutas completadas se muestran como polylines discontinuas en `GeoMapaVuelo`. Se puede extender este mecanismo existente para añadir una capa adicional de polyline de ruta destacada y resaltar vuelos individuales sin modificar la lógica base de animación.

## Goals / Non-Goals

**Goals:**
- Agregar botón "Mostrar ruta" por fila de envío en `PanelEnviosOperacion` y `PanelEnvios`.
- Dibujar polyline en el mapa con la ruta completa del plan de viaje (origen → aeropuertos intermedios → destino).
- Resaltar los vuelos involucrados (mayor grosor, glow, z-index superior).
- Ajustar la cámara (`fitBounds`) para mostrar la ruta completa.
- Soporte en las tres vistas: OperacionView, SimulacionView, ColapsoView.
- Limpiar el resalte al pulsar ESC o botón "Cerrar ruta".

**Non-Goals:**
- No se modifica el comportamiento base de animación de vuelos.
- No se agrega seguimiento continuo de cámara (solo fitBounds inicial).
- No se modifica la lógica de selección múltiple (solo botón por fila).
- No se crean nuevos endpoints backend.

## Decisions

1. **Nuevo tipo `RutaDestacada` en types.ts** — Contiene `vueloIds: string[]` (IDs de vuelos a resaltar) y `coordenadas: [number, number][]` (puntos de la polyline). Se pasa como prop a `GeoMapa`. Si es `null`, se limpia el resalte.

2. **Polyline directa en GeoMapa (no en capa separada)** — Se renderiza un `<Polyline>` de react-leaflet directamente dentro de `GeoMapa.tsx` condicional a `rutaDestacada`. Alternativa considerada: crear un componente `GeoMapaRuta.tsx` separado (mejor encapsulación pero más archivos para un cambio simple).

3. **Prop `destacado` en GeoMapaVuelo/AvionAnimado** — Se pasa `destacado?: boolean` desde `GeoMapa` cuando el vuelo está en `rutaDestacada.vueloIds`. Cuando es `true`, el trail se renderiza más grueso y con efecto glow. Alternativa considerada: filtrar vuelos no destacados (oculta información contextual importante).

4. **Búsqueda de vuelos por `codigo_vuelo` en el padre** — El panel retorna `segmentos` al padre (page.tsx) mediante `onMostrarRuta(segmentos)`. El padre busca `VueloEnMapa` por `codigo_vuelo` y `AeropuertoEnMapa` por IATA. Alternativa considerada: que el panel haga toda la lógica (no tiene acceso a los arrays de vuelos/aeropuertos del padre).

5. **Misma consulta `fetchPlanViaje` de la task anterior** — Reutiliza la función `fetchPlanViaje(equipajeId)` ya agregada en `api.ts`. No se necesita código nuevo en la capa API.

6. **Icono `Route` de lucide-react** — Representa visualmente "ruta/waypoints", distinto de `MapPin` (task 1 = seguir vuelo individual). Alternativa considerada: `GitBranch` o `Waypoints` (menos estándar).

## Risks / Trade-offs

- **Datos no disponibles** → Si un `codigo_vuelo` del segmento no existe en los vuelos del mapa (ej. vuelo futuro no cargado), no se resalta. Mitigación: se muestra la polyline igual (usa coordenadas de aeropuertos), los vuelos faltantes simplemente no se resaltan.
- **Ruta muy larga (muchos segmentos)** → Polyline con muchos puntos puede ser visualmente densa. Mitigación: el fitBounds asegura que se vea completa y el usuario puede hacer zoom manual.
- **Sobrescritura entre tareas** → Si el usuario pulsa "Seguir en mapa" (task 1) y luego "Mostrar ruta" (task 2), ambos mecanismos coexisten (seguidoVueloId vs rutaDestacada). Si se pulsa "Mostrar ruta", el seguidoVueloId anterior se mantiene pero el fitBounds de la ruta puede mover la cámara.
