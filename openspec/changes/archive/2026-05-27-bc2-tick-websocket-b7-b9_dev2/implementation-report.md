# B07 + B09 — TickService y WebSocket Telemetría

## Resumen

Implementación del **TickService** (B07) y **WebSocket de telemetría** (B09) para el sistema TAS FB2B. Estas dos capacidades son el corazón de la simulación en tiempo real: el tick avanza el reloj virtual, procesa vuelos/equipajes y escribe métricas en Redis; el WebSocket emite telemetría en vivo a los clientes conectados.

## Tareas completadas

| # | Tarea | Estado |
|---|---|---|
| **5.x** | TickService (B7) — 11/12 subtareas | ✅ |
| **6.x** | RedisCacheService — 4 métodos agregados | ✅ |
| **7.x** | WebSocket telemetría (B9) — 9/9 subtareas | ✅ |
| **9.x** | SesionService — métricas reales desde Redis | ✅ |

### Subtarea pendiente (no bloqueante)
- **5.9**: Registro de `PuntoSLA` cada hora virtual (requiere entidad `PuntoSLA` de la Task 1, fuera del alcance de Dev 2)

## Archivos creados (4)

| Archivo | Paquete | Propósito |
|---|---|---|
| `TickService.java` | `bc2/application/` | Scheduler `@Scheduled(fixedRate=5000)` que procesa el reloj virtual, detección de vuelos, cancelaciones, métricas Redis y detección de colapso |
| `TelemetriaService.java` | `bc2/application/` | Construye JSON de telemetría (nodos, vuelos con interpolación, métricas de sesión) y lo emite vía WebSocket |
| `WebSocketConfig.java` | `bc2/infrastructure/` | Configuración `@EnableWebSocket` que registra el handler en `ws://host/api/ws/telemetria` |
| `TelemetriaWebSocket.java` | `bc2/infrastructure/` | `TextWebSocketHandler` con autenticación JWT vía query param, broadcast de telemetría a sesiones conectadas |

## Archivos modificados (7)

| Archivo | Cambio |
|---|---|
| `pom.xml` | + `spring-boot-starter-websocket` |
| `RedisCacheService.java` (`shared/infrastructure/`) | + `setMetricasSesion`, `getMetricasSesion`, `setEstadoSesion`, `getEstadoSesion` |
| `SegmentoPlanRepository.java` (`bc1/infrastructure/`) | + `findByVueloId`, `findByVueloIdAndEstado` |
| `VueloRepository.java` (`bc1/infrastructure/`) | + `findByEstadoAndHoraSalidaLessThanEqual`, `findByEstadoAndHoraLlegadaLessThanEqual`, `findByEstadoIn`, `countByEstado` |
| `SesionEjecucion.java` (`bc2/domain/`) | + Getters/setters: `getAlmacenRojoMin/Max`, `getVueloRojoMin/Max` |
| `SesionService.java` (`bc2/application/`) | `obtenerMetricas` lee de Redis (fallback a BD), actualiza `sesion:{id}:estado` en cada transición, limpia Redis al finalizar |
| `SecurityConfig.java` (`shared/security/`) | + `requestMatchers("/api/ws/telemetria/**").permitAll()` |

## Tests creados (2 archivos, 14 tests)

| Archivo | Tests | Cobertura |
|---|---|---|
| `TickServiceTest.java` | 7 tests | Avance reloj virtual, detección de salidas/llegadas, colapso, métricas Redis, cancelación probabilística, no ejecución en sesiones no activas |
| `TelemetriaServiceTest.java` | 7 tests | Inclusión de nodos con colores, interpolación de vuelos EN_RUTA, métricas de sesión en JSON, colores VERDE/ÁMBAR/ROJO para nodos y vuelos, sesión vacía |

## Detalle de Implementación

### B07 — TickService (`bc2/application/TickService.java`)

```
@Scheduled(fixedRate = 5000)
tick()
  └─ por cada SesionEjecucion EN_CURSO:
      ├── avanzarRelojVirtual()
      │   → diaHoraVirtual += 10 min virtuales por tick (escala 120x)
      │   → segundosRealesTranscurridos += 5
      ├── procesarVuelosSalida()
      │   → Vuelos PROGRAMADO con horaSalida ≤ virtual → EN_RUTA
      │   → Segmentos PENDIENTE → EN_CURSO
      │   → Equipajes → EN_VUELO
      ├── procesarVuelosLlegada()
      │   → Vuelos EN_RUTA con horaLlegada ≤ virtual → COMPLETADO
      │   → Segmentos EN_CURSO → COMPLETADO
      │   → Equipajes: último segmento → ENTREGADO, else → EN_ALMACEN
      ├── evaluarCancelaciones()
      │   → random < probCancelacion para cada vuelo PROGRAMADO
      │   → Marca vuelo CANCELADO, equipajes EN_REPLANIFICACION
      │   → Crea EventoCancelacion + LoteReplanificacion
      │   → Publica VueloCanceladoEvent
      ├── detectarColapso()
      │   → Si ocupacionNodo > almacenRojoMax → sesión COLAPSADA
      ├── escribirMetricas()
      │   → JSON → Redis sesion:{id}:metricas
      │   → Estado → Redis sesion:{id}:estado
      └── telemetriaService.emitirTelemetria()
          → Broadcast WebSocket
```

### B09 — WebSocket Telemetría

**Autenticación:**
- Conexión vía `ws://host/api/ws/telemetria?token={jwt}`
- `TelemetriaWebSocket.afterConnectionEstablished()` extrae token del query param
- Si token inválido/ausente → cierra con `CloseStatus.POLICY_VIOLATION`

**Formato del mensaje JSON (cada tick):**
```json
{
  "timestamp": "ISO-8601",
  "nodos": [{"id", "codigo_iata", "lat", "lon", "ocupacion_pct", "color"}],
  "vuelos": [{"id", "codigo_vuelo", "estado", "lat_actual", "lon_actual", "ocupacion_pct", "color"}],
  "metricas_sesion": {"sesion_id", "estado", "dia_hora_virtual", "segundos_reales_transcurridos", "sla_acumulado_pct", "vuelos_cancelados", "maletas_replanificadas"}
}
```

**Interpolación de posición de vuelos EN_RUTA:**
- `progreso = (virtual - horaSalida) / (horaLlegada - horaSalida)`
- `lat = origenLat + (destinoLat - origenLat) * min(progreso, 1.0)`
- Misma fórmula para longitud

**Cálculo de colores:**
- `pct <= verdeMax` → VERDE
- `pct <= ambarMax` → ÁMBAR
- else → ROJO

## Cómo testear

### Tests unitarios
```bash
cd backend/backend
mvn test -Dtest="TickServiceTest,TelemetriaServiceTest"
```

### Test manual (requiere BD + Redis)
1. Iniciar backend: `mvn spring-boot:run`
2. Login: `POST /api/auth/login` con `analista@tasfb2b.com` / `analista123`
3. Crear sesión: `POST /api/sesiones`
4. Iniciar sesión: `POST /api/sesiones/{id}/iniciar`
5. Ver métricas: `GET /api/sesiones/{id}/metricas` (con token Bearer)
6. Conectar WebSocket: `wscat -c "ws://localhost:8080/api/ws/telemetria?token={jwt}"`

## Dependencias con otras tareas

| Dependencia | Tarea | Estado |
|---|---|---|
| RedisCacheService métodos | Task 6 | ✅ Completada como parte de esta implementación |
| SegmentoPlanRepository.findByVueloId | — | ✅ Agregado |
| VueloRepository queries | — | ✅ Agregado |
| SesionService estados en Redis | Task 9 | ✅ Completada como parte de esta implementación |
| ReplanificacionService (cancela vuelos) | B6 (Task 4) | ⏳ Pendiente (Dev 1) — TickService publica eventos que B6 escucha |
| ReporteService (genera reporte final) | B8 (Task 8) | ⏳ Pendiente (Dev 1) — Usa métricas de Redis escritas por TickService |
| PuntoSLA entity | Task 1.3 | ⏳ Pendiente — Necesaria para subtarea 5.9 |
