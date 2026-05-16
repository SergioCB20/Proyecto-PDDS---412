## 1. Entidades y repositorios faltantes (BC2 Domain)

- [ ] 1.1 Crear `ItemLote.java` entidad JPA con campos: id, loteId, equipajeRefId, estadoReplanificacion, createdAt
- [ ] 1.2 Crear `ReporteSesion.java` entidad JPA con campos: id, sesionId, slaIncumplidoPct, totalReplanificadas, puntoColapsoVirtual, nodoColapsoRefId, causaColapso, generadoEn
- [ ] 1.3 Crear `PuntoSLA.java` entidad JPA con campos: id, reporteId, momentoVirtual, slaPct, huboCancelacion, vueloCanceladoRefId
- [ ] 1.4 Crear `EstadoReplanificacion.java` enum: PENDIENTE, ENRUTADO, INCUMPLIMIENTO_SLA, FALLIDO
- [ ] 1.5 Crear `ItemLoteRepository.java` con método `findByLoteId(UUID)`
- [ ] 1.6 Crear `ReporteSesionRepository.java` con método `findBySesionId(UUID)`
- [ ] 1.7 Crear `PuntoSLARepository.java` con método `findByReporteIdOrderByMomentoVirtual(UUID)`

## 2. Eventos publicados por BC2 (shared/events)

- [ ] 2.1 Crear `PlanViajeCreado.java` record con equipajeId, planViajeId, sesionId, timestamp
- [ ] 2.2 Crear `ReplanificacionIniciada.java` record con loteId, sesionId, totalEquipajes, timestamp
- [ ] 2.3 Crear `SesionFinalizada.java` record con sesionId, estadoFinal, timestamp

## 3. Motor de enrutamiento (B4)

- [ ] 3.1 Crear `MotorEnrutamiento.java` como @Service stateless en `bc2/application/`
- [ ] 3.2 Implementar método `calcularRuta(UUID, String, LocalDateTime, UUID)` con algoritmo greedy
- [ ] 3.3 Implementar búsqueda de vuelo directo desde nodo origen a destino
- [ ] 3.4 Implementar búsqueda de conexión de 2 escalas con mínimo 60 min entre vuelos
- [ ] 3.5 Implementar validación de SLA (hora_llegada <= sla_comprometido)
- [ ] 3.6 Implementar validación de capacidad (carga_disponible > 0)
- [ ] 3.7 Implementar método `evaluarColor(double, UmbralCapacidad)` para umbrales
- [ ] 3.8 Publicar evento `PlanViajeCreado` al calcular ruta exitosamente
- [ ] 3.9 Escribir tests unitarios para vuelo directo
- [ ] 3.10 Escribir tests unitarios para conexión de 2 escalas
- [ ] 3.11 Escribir tests unitarios para caso sin ruta posible
- [ ] 3.12 Escribir tests unitarios para capacidad agotada

## 4. ReplanificacionService (B6)

- [ ] 4.1 Crear `ReplanificacionService.java` en `bc2/application/`
- [ ] 4.2 Implementar `@EventListener(VueloCanceladoEvent)` para recibir cancelaciones
- [ ] 4.3 Implementar búsqueda de SegmentoPlan PENDIENTE/EN_CURSO que referencian vuelo cancelado
- [ ] 4.4 Implementar obtención de equipajes afectados por segmentos cancelados
- [ ] 4.5 Implementar cambio de estado de equipajes a `EN_REPLANIFICACION`
- [ ] 4.6 Implementar creación de `LoteReplanificacion` y `ItemLote` por cada equipaje
- [ ] 4.7 Implementar llamada a `MotorEnrutamiento` para cada ItemLote
- [ ] 4.8 Implementar evaluación SLA: ENRUTADO si respeta, INCUMPLIMIENTO_SLA si no
- [ ] 4.9 Publicar evento `ReplanificacionIniciada` al comenzar proceso
- [ ] 4.10 Incrementar `maletas_replanificadas` en métricas de sesión
- [ ] 4.11 Actualizar Redis: `nodo:{id}:ocupacion` y `vuelo:{id}:carga_disponible` al replanificar

## 5. TickService (B7)

- [ ] 5.1 Crear `TickService.java` en `bc2/application/`
- [ ] 5.2 Implementar `@Scheduled(fixedRate = 5000)` para ticks cada 5 segundos
- [ ] 5.3 Implementar avance de `dia_hora_virtual` según factor de escala
- [ ] 5.4 Implementar detección de vuelos que deben salir (hora_salida <= dia_hora_virtual)
- [ ] 5.5 Implementar detección de vuelos que deben llegar (hora_llegada <= dia_hora_virtual)
- [ ] 5.6 Implementar actualización de estados de equipajes (EN_ALMACEN → EN_VUELO → EN_ALMACEN)
- [ ] 5.7 Implementar evaluación de probabilidad de cancelación y generación aleatoria
- [ ] 5.8 Implementar escritura de métricas en Redis como JSON: `sesion:{id}:metricas`
- [ ] 5.9 Implementar registro de `PuntoSLA` cada hora virtual transcurrida
- [ ] 5.10 Implementar detección de colapso (ocupacion > almacen_rojo_max)
- [ ] 5.11 Implementar actualización de `sesion:{id}:estado` en Redis al cambiar estado
- [ ] 5.12 Implementar limpieza de claves Redis al finalizar sesión

## 6. RedisCacheService - métodos faltantes

- [ ] 6.1 Agregar método `setMetricasSesion(UUID, String)` para escribir JSON en `sesion:{id}:metricas`
- [ ] 6.2 Agregar método `getMetricasSesion(UUID)` para leer JSON desde `sesion:{id}:metricas`
- [ ] 6.3 Agregar método `setEstadoSesion(UUID, String)` para escribir en `sesion:{id}:estado`
- [ ] 6.4 Agregar método `getEstadoSesion(UUID)` para leer desde `sesion:{id}:estado`

## 7. WebSocket de telemetría (B9)

- [ ] 7.1 Agregar dependencia `spring-boot-starter-websocket` en `pom.xml`
- [ ] 7.2 Crear `WebSocketConfig.java` con `@EnableWebSocket` y registro de handler
- [ ] 7.3 Crear `TelemetriaWebSocket.java` extending `TextWebSocketHandler`
- [ ] 7.4 Implementar autenticación por query param `?token={jwt}` en `afterConnectionEstablished`
- [ ] 7.5 Implementar emisión de JSON de telemetría cada tick (nodos, vuelos, metricas_sesion)
- [ ] 7.6 Implementar interpolación de posición de vuelos EN_RUTA (lat/lon)
- [ ] 7.7 Implementar cálculo de `ocupacion_pct` y `color` para nodos
- [ ] 7.8 Implementar cálculo de `ocupacion_pct` y `color` para vuelos
- [ ] 7.9 Manejar desconexiones y limpieza de sesiones WebSocket

## 8. ReporteService y MetricasController (B8)

- [ ] 8.1 Crear `ReporteService.java` en `bc2/application/`
- [ ] 8.2 Implementar generación de `ReporteSesion` al finalizar sesión
- [ ] 8.3 Implementar cálculo de `sla_incumplido_pct`
- [ ] 8.4 Implementar construcción de `serie_sla` desde `PuntoSLARepository`
- [ ] 8.5 Implementar detección de punto de colapso para reporte
- [ ] 8.6 Crear `MetricasController.java` en `bc2/infrastructure/` con `@PreAuthorize("hasRole('ANALISTA')")`
- [ ] 8.7 Implementar `GET /sesiones/{id}/metricas` leyendo desde Redis (reemplazar dummy en SesionController)
- [ ] 8.8 Implementar `GET /sesiones/{id}/reporte` retornando `ReporteSesion` con serie SLA
- [ ] 8.9 Crear DTOs de respuesta: `ReporteSesionResponse`, `PuntoSLAResponse`

## 9. SesionService - reemplazar métricas dummy

- [ ] 9.1 Modificar `obtenerMetricas(UUID)` en `SesionService` para leer desde RedisCacheService
- [ ] 9.2 Eliminar datos hardcodeados/dummy del método
- [ ] 9.3 Agregar manejo de error cuando Redis no está disponible

## 10. Frontend C7 — Botón manifiesto PDF

- [ ] 10.1 Agregar botón "Descargar Manifiesto" en `app/operacion/page.tsx`
- [ ] 10.2 Implementar handler que llame `GET /manifiestos/{vuelo_id}` con blob response
- [ ] 10.3 Implementar descarga del PDF con nombre `manifiesto_{codigo_vuelo}_{fecha}.pdf`
- [ ] 10.4 Agregar manejo de errores (404 vuelo no encontrado, 422 sin equipajes)

## 11. Frontend C6 — Link a reporte

- [ ] 11.1 En `app/simulacion/[id]/page.tsx`, detectar cuando estado = FINALIZADA
- [ ] 11.2 Mostrar botón "Ver Reporte" cuando sesión está FINALIZADA
- [ ] 11.3 Botón redirige a `/simulacion/{id}/reporte`
- [ ] 11.4 Verificar que `app/simulacion/[id]/reporte/page.tsx` consume `GET /sesiones/{id}/reporte` correctamente

## 12. Integración y verificación

- [ ] 12.1 Ejecutar tests unitarios del MotorEnrutamiento (todos deben pasar)
- [ ] 12.2 Verificar que `VueloCanceladoEvent` triggera replanificación
- [ ] 12.3 Verificar que TickService escribe métricas en Redis
- [ ] 12.4 Verificar que `GET /sesiones/{id}/metricas` retorna datos reales (no dummy)
- [ ] 12.5 Verificar que `GET /sesiones/{id}/reporte` retorna reporte con serie SLA
- [ ] 12.6 Verificar que WebSocket emite telemetría cada tick
- [ ] 12.7 Verificar que botón PDF descarga manifiesto correctamente
- [ ] 12.8 Verificar que link a reporte aparece cuando sesión = FINALIZADA
- [ ] 12.9 Ejecutar `mvn test` en backend — todos los tests deben pasar
- [ ] 12.10 Ejecutar `npm run build` en frontend — sin errores de compilación
- [ ] 12.11 Actualizar `openspec/specs/api-contracts.md` con endpoints nuevos si es necesario
