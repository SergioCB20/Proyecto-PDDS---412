## Context

El `PanelAeropuertosOperacion` muestra una tabla de aeropuertos con ocupación del almacén. Al hacer clic en un aeropuerto se abre `ModalEnvios`, que carga datos del endpoint `GET /api/nodos/{iata}/equipajes`. Este endpoint tiene dos problemas:

1. **Datos incorrectos**: Usa `origenIata`/`destinoIata` del `Equipaje` (origen original y destino final), no la ubicación real. Un equipaje en un nodo intermedio no aparece porque su `destinoIata` es el destino final, no el nodo actual.
2. **Cobertura incompleta**: Solo captura `REGISTRADO` (saliendo) y `EN_ALMACEN` (llegando). No incluye `ENRUTADO` cuyo primer segmento sale del nodo, ni `EN_VUELO` con destino al nodo.

El usuario requiere un panel dividido: tabla de aeropuertos con conteos de envíos saliendo/llegando, y al seleccionar un aeropuerto, un detalle inline con la lista completa de envíos clasificados.

## Goals / Non-Goals

**Goals:**
- Nuevo endpoint `GET /api/nodos/{iata}/envios` que retorne envíos clasificados en "saliendo" y "llegando" con datos correctos (ubicación real, no origen/destino original)
- Panel dividido en `PanelAeropuertosOperacion`: tabla con conteos arriba + detalle inline abajo al seleccionar aeropuerto
- Cada envío en el detalle debe mostrar: código equipaje, cantidad maletas, estado, código vuelo, origen/destino, y maletas individuales expandibles
- Mantener funcionalidad existente: botones "Seguir en mapa", "Ruta", "PDF" por envío

**Non-Goals:**
- No se modifica el modal `ModalEnvios` para tipo `vuelo` (sigue funcionando igual)
- No se agregan filtros adicionales al panel de aeropuertos
- No se cambia la lógica de sincronización mapa/panel existente
- No se implementa caché para los conteos (se cargan bajo demanda)

## Decisions

### Decisión 1: Endpoint dedicado vs ampliar endpoint existente
- **Opción A (elegida):** Crear `GET /api/nodos/{iata}/envios` con respuesta rica (clasificada + conteos + maletas)
- **Opción B:** Agregar query params a `GET /api/nodos/{iata}/equipajes`
- **Por qué A:** El response actual `EnvioItemOperacionResponse` es minimalista (solo 4 campos). Agregar clasificación y maletas rompería el contrato existente. Un endpoint nuevo evita breaking changes y permite un DTO específico para la nueva vista.

### Decisión 2: Queries JPQL vs lógica en servicio
- **Opción A (elegida):** Tres queries JPQL especializadas en `EquipajeRepository` + deduplicación en `EquipajeService`
- **Opción B:** Una sola query nativa compleja con UNION
- **Por qué A:** Las queries son más mantenibles, testables individualmente, y aprovechan el JPQL type-safe. La deduplicación con `LinkedHashSet` es simple y evita SQL complejo.

### Decisión 3: Panel inline vs modal para detalle de aeropuerto
- **Opción A (elegida):** Panel de detalle inline dentro de `PanelAeropuertosOperacion`
- **Opción B:** Modal mejorado (como ahora) con datos corregidos
- **Por qué A:** El usuario solicitó explícitamente "panel dividido: tabla arriba + detalle abajo". Además, el panel inline permite ver la tabla y el detalle simultáneamente, mejorando la usabilidad.

### Decisión 4: Carga de conteos en la tabla
- **Opción A (elegida):** Cargar los conteos lazy al renderizar el panel (un GET por aeropuerto sería ineficiente). Mejor: incluir conteos en la respuesta del endpoint de detalle y cachearlos en un Map local, o agregar un endpoint batch `/api/nodos/envios/conteos`.
- **Decisión final:** Inicialmente, cargar conteos inline al seleccionar un aeropuerto y mostrar "—" para no seleccionados. Posteriormente se puede optimizar con endpoint batch si es necesario.

## Risks / Trade-offs

- **[Rendimiento]** Si hay muchos aeropuertos, cargar conteos para cada uno en paralelo podría ser lento. → Mitigación: Inicialmente solo se cargan conteos del aeropuerto seleccionado. El endpoint batch se agrega solo si hay quejas de performance.
- **[Datos duplicados]** Un equipaje podría calificar como "saliendo" y "llegando" simultáneamente (ej: EN_ALMACEN en un nodo intermedio). → Mitigación: `LinkedHashSet` con prioridad: si está en ambos, cuenta como "saliendo" si tiene segmentos pendientes, "llegando" si todos los segmentos están completados.
- **[Consistencia]** Los datos del detalle se cargan bajo demanda y no se refrescan automáticamente. → Mitigación: El usuario cierra y vuelve a abrir para refrescar. En operación real, el tick mueve los equipajes cada 1s, pero no es crítico para la vista de detalle.
- **[Complejidad de queries JPQL]** Las queries con subconsultas y joins múltiples pueden ser lentas en tablas grandes. → Mitigación: Índices en `segmentos_plan.plan_viaje_id`, `segmentos_plan.orden`, `segmentos_plan.estado`, `equipajes.estado`, `equipajes.vuelo_actual_id`. Límite de 200 resultados por query.
