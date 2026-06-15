## Context

La simulación avanza el estado virtual de equipajes, vuelos y nodos mediante `TickService`, que persiste todo en PostgreSQL (`equipajes`, `vuelos`, `nodos_logisticos`, `planes_viaje`, `segmentos_plan`). Actualmente no hay endpoints que expongan el estado virtual de los equipajes desde la perspectiva de la sesión. Los endpoints B2-B3-B4 llenan ese vacío para que el frontend pueda mostrar envíos asignados a vuelos, almacenados en nodos, y entregados recientemente.

## Goals / Non-Goals

**Goals:**
- Exponer 3 endpoints GET de solo lectura bajo `/api/sesiones/{id}/envios/*`
- Consultar el estado virtual persistido por `TickService` en PostgreSQL
- Usar el mismo patrón que los endpoints existentes (`SesionController` → `SesionService` → repositorios)
- Reutilizar consultas existentes donde sea posible, agregando solo las queries faltantes

**Non-Goals:**
- No crear nuevas tablas ni migraciones Flyway
- No modificar entidades existentes (Equipaje, Vuelo, NodoLogistico, PlanViaje, SegmentoPlan)
- No cambiar la lógica del motor de simulación (`TickService`, `MotorEnrutamiento`)
- No implementar caché Redis para estos endpoints

## Decisions

### 1. Ubicación de los endpoints en `SesionController.java`
Los endpoints de sesión ya están en `SesionController.java` con `@PreAuthorize("hasRole('ANALISTA')")`. Los nuevos endpoints siguen el mismo patrón en lugar de crear un控制ador separado, manteniendo cohesión con el recurso `/api/sesiones/`.

### 2. Lógica de negocio en `SesionService.java`
Los métodos de consulta se añaden a `SesionService.java` (no se crea un servicio nuevo) porque:
- Ya tiene acceso a los repositorios necesarios (`SesionRepository`)
- Es el servicio que gestiona el ciclo de vida de las sesiones
- Evita crear una capa adicional innecesaria

### 3. Queries JPQL en repositorios existentes
Se añaden métodos `@Query` en `EquipajeRepository` y `PlanViajeRepository` en lugar de crear nuevos repositorios. Las relaciones JPA entre entidades permiten joins JPQL sin SQL nativo.

### 4. Estrategia para B2 (envíos por vuelo)
- Usar `EquipajeRepository.findByVueloActualId(vueloId)` existente
- Filtrar en memoria por `PlanViaje.sesionId == sesionId` para asegurar que pertenecen a la sesión
- Alternativa considerada: query JPQL con join a PlanViaje — se descarta porque la query existente ya resuelve el caso y el filtrado en memoria es barato (pocos equipajes por vuelo)

### 5. Estrategia para B3 (envíos por nodo)
- Cuando un equipaje está `EN_ALMACEN`, su `vueloActual` apunta al último vuelo que lo entregó (aún sin nullificar)
- El `destino` de ese vuelo es el nodo donde está almacenado
- Query: `Equipaje` donde `PlanViaje.sesionId = sesionId` AND `estado = EN_ALMACEN` AND `vueloActual.destino.codigoIata = nodoIata`
- Alternativa considerada: usar `SegmentoPlan` para determinar el último nodo destino — más compleja y menos directa

### 6. Estrategia para B4 (entregados recientes)
- Los equipajes `ENTREGADO` tienen `vueloActual = null` (se setea en TickService)
- El tiempo de entrega virtual se determina por la `horaLlegada` del `Vuelo` del último segmento completado
- Query JPQL con subquery: encontrar el último `SegmentoPlan.COMPLETADO` de cada equipaje, cuyo `Vuelo.horaLlegada` esté dentro de la ventana virtual
- Alternativa considerada: agregar columna `fecha_entrega_virtual` a `planes_viaje` — descartada porque requiere migración Flyway

### 7. DTOs separados
- `EnvioItemResponse`: reutilizable entre B2 y B3 (origen, destino, código, cantidad)
- `EnvioEntregadoResponse`: específico para B4 (incluye código_vuelo en lugar de código_equipaje)
- Alternativa considerada: DTO único — descartada porque los campos requeridos difieren

## Risks / Trade-offs

- **[B4 performance]** La query con subquery `MAX(orden)` puede ser lenta con muchos equipajes entregados → **Mitigación:** la ventana de horas virtuales acota el resultado; los equipajes entregados fuera de la ventana no se consultan.
- **[B3 accuracy]** La estrategia de `vueloActual.destino` para equipajes `EN_ALMACEN` asume que el vueloActual no se nullifica — esto es correcto en el código actual de `TickService.procesarVuelosLlegada()` pero es un acoplamiento a ese comportamiento. → **Mitigación:** si en el futuro se nullifica `vueloActual` para `EN_ALMACEN`, habrá que migrar a la estrategia de SegmentoPlan.
- **[Sin Redis]** Los endpoints leen directo de PostgreSQL, no de Redis. Esto es intencional porque Redis cachea métricas agregadas, no listas de equipajes. La carga es baja.
