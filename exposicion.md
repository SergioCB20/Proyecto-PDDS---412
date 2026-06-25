# TAS FB2B — Bloque 1: Solución de Alto Nivel

> Material de apoyo para exposición final.
> Generado a partir de la revisión completa del repositorio.
> Fuente: `openspec/specs/`, `backend/`, `frontend/`, `openspec/changes/`

---

## Índice

1. [El Problema de Negocio](#1-el-problema-de-negocio)
2. [La Solución de Alto Nivel](#2-la-solución-de-alto-nivel)
3. [Arquitectura General](#3-arquitectura-general)
4. [Funcionalidades por Rol](#4-funcionalidades-por-rol)
5. [Motor de Enrutamiento (Core del Negocio)](#5-motor-de-enrutamiento-core-del-negocio)
6. [Ciclo de Vida del Equipaje](#6-ciclo-de-vida-del-equipaje)
7. [Mapa Interactivo en Tiempo Real](#7-mapa-interactivo-en-tiempo-real)
8. [Paneles Operativos (Dashboard del Operador)](#8-paneles-operativos-dashboard-del-operador)
9. [Carga Masiva de Equipaje](#9-carga-masiva-de-equipaje)
10. [Sesiones de Simulación](#10-sesiones-de-simulación)
11. [Arquitectura de Tiempo Real (3 Canales)](#11-arquitectura-de-tiempo-real-3-canales)
12. [Reporte Final con Gráfico SLA](#12-reporte-final-con-gráfico-sla)
13. [Seguridad y Autenticación JWT](#13-seguridad-y-autenticación-jwt)
14. [Base de Datos y Caché](#14-base-de-datos-y-caché)
15. [Motor de Simulación por Ticks](#15-motor-de-simulación-por-ticks)
16. [Mecanismos de Concurrencia](#16-mecanismos-de-concurrencia)
17. [Cadena de Eventos de Dominio](#17-cadena-de-eventos-de-dominio)
18. [Manejo de Errores Global](#18-manejo-de-errores-global)
19. [Animación de Aviones y Notificaciones](#19-animación-de-aviones-y-notificaciones)
20. [Filtros y Ordenamiento en Paneles](#20-filtros-y-ordenamiento-en-paneles)
21. [Valor Agregado Técnico](#21-valor-agregado-técnico)
22. [Propuesta de Diapositivas](#22-propuesta-de-diapositivas)

---

## 1. El Problema de Negocio

**Contexto:** La logística de equipaje en aeropuertos es un proceso crítico. Cuando un pasajero factura una maleta, el sistema aeroportuario debe:

- Determinar **qué ruta** debe seguir esa maleta (posiblemente con escalas)
- Asignarla a **vuelos específicos** respetando capacidad de carga
- Garantizar que llegue **antes del SLA comprometido** (Service Level Agreement)
- Reaccionar ante **cancelaciones de vuelo** — replanificar rutas en segundos

**Dolor real:** Sin automatización, las aerolíneas enfrentan:
- Maletas perdidas o retrasadas → multas y mala experiencia
- Procesos manuales ante cancelaciones → caos operativo
- Falta de visibilidad en tiempo real del estado del equipaje

---

## 2. La Solución de Alto Nivel

**TAS FB2B** es un **sistema de gestión logística de equipaje** que resuelve el enrutamiento óptimo entre aeropuertos, con:

| Dimensión | Cómo lo resuelve |
|---|---|
| **Enrutamiento** | Motor con dos algoritmos: Greedy (rápido, determinista) y ACO - Ant Colony Optimization (preciso, estocástico para lotes) |
| **Monitoreo** | Dashboard en vivo con mapa Leaflet, WebSocket y SSE (Server-Sent Events) |
| **Simulación** | Permite simular 5 días virtuales en ~30-90 min reales (factor k=120~240) con eventos aleatorios |
| **Replanificación** | Ante una cancelación, identifica equipajes afectados y recalcula rutas automáticamente |
| **Roles** | RBAC con 3 roles: ADMINISTRADOR, OPERADOR_LOGISTICO, ANALISTA |

---

## 3. Arquitectura General

```
┌──────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js 16)              │
│  /login  /operacion  /simulacion  /admin             │
│  Mapa Leaflet · Gráficos Recharts · Notificaciones   │
│  Conexión SSE + WebSocket                            │
├──────────────────────────────────────────────────────┤
│              API REST (Spring Boot 3 + Java 21)       │
├─────────────────┬──────────────────┬─────────────────┤
│  BC1 Gestión    │  BC2 Planif.     │  BC3 Identidad  │
│  Operativa      │  y Replanif.     │  y Acceso       │
│                 │                  │                 │
│  · Equipaje     │  · Sesiones      │  · Usuarios     │
│  · Vuelos       │  · Motor         │  · Roles        │
│  · Nodos        │    Enrutamiento  │  · Auth JWT     │
│  · PlanViaje    │  · TickService   │  · Auditoría    │
│  · Manifiestos  │  · Telemetría WS │                 │
│  · Carga Masiva │  · Reportes      │                 │
├─────────────────┴──────────────────┴─────────────────┤
│              PostgreSQL + Redis (caché)               │
└──────────────────────────────────────────────────────┘
```

**Principios:**
- Domain-Driven Design (DDD): Cada bounded context con su propio dominio, servicios e infraestructura
- Comunicación entre BCs vía **eventos de dominio** (ApplicationEventPublisher de Spring)
- Base de datos como **fuente de verdad**, Redis como **caché de lectura rápida**
- Flyway para migraciones (V1 a V11+)
- 11 migraciones Flyway con tablas para los 3 bounded contexts

---

## 4. Funcionalidades por Rol

### OPERADOR_LOGISTICO — El usuario operativo

| Funcionalidad | Endpoint / Ruta | Soporte técnico |
|---|---|---|
| Registro de equipaje individual | `POST /api/equipajes` | Valida destino, cantidad, capacidad de almacén; origen autocompletado del JWT |
| Carga masiva desde CSV | `POST /api/equipajes/carga-masiva` | Preview + confirmación en dos pasos con tabla de válidos/revisión |
| Confirmar carga masiva | `POST /api/equipajes/carga-masiva/confirmar` | Ingresa solo los registros válidos del preview |
| CRUD de vuelos | `GET/POST/PUT/DELETE /api/vuelos` | Crear, editar, eliminar vuelos con control de estado |
| Cancelación de vuelo | `POST /api/simulacion/cancelacion` | Dispara replanificación automática vía eventos de dominio |
| Manifiesto PDF | `GET /api/manifiestos/{vuelo_id}` | Descarga PDF con nombre `manifiesto_{codigo}_{fecha}.pdf` |
| Mapa operativo | `/operacion` vía frontend | Visualiza nodos y vuelos en Leaflet con colores por ocupación |
| Paneles de envíos | Frontend | Equipajes en tránsito agrupados, drill-down por nodo/vuelo |
| Panel de entregados | Frontend | Historial de entregas completadas |
| Editar/Eliminar equipaje | `PUT/DELETE /api/equipajes/{id}` | Modificar destino o eliminar (libera carga del vuelo) |

### ANALISTA — El usuario de simulación

| Funcionalidad | Endpoint / Ruta | Soporte técnico |
|---|---|---|
| Configurar sesión de simulación | `POST /api/sesiones` | Parámetros: fecha virtual, probabilidad de cancelación, umbrales verde/ámbar/rojo |
| Iniciar sesión | `POST /api/sesiones/{id}/iniciar` | Arranca el motor de ticks |
| Pausar sesión | `POST /api/sesiones/{id}/pausar` | Congela el reloj virtual |
| Detener sesión | `POST /api/sesiones/{id}/detener` | Finaliza y genera reporte |
| Monitoreo en vivo | WebSocket + SSE + Polling | SLA%, cancelaciones, replanificaciones cada ~5s |
| Ver métricas | `GET /api/sesiones/{id}/metricas` | Polling cada 3s como fallback |
| Reporte final | `GET /api/sesiones/{id}/reporte` | Gráfico SLA vs Tiempo (Recharts), % incumplimiento, colapso |
| Exportar rutas CSV | `GET /api/sesiones/{id}/rutas/csv` | Descargable |

### ADMINISTRADOR — Control de acceso

| Funcionalidad | Endpoint / Ruta | Soporte técnico |
|---|---|---|
| CRUD de usuarios | `GET/POST /api/usuarios` | Crear, listar, modificar |
| Cambiar estado | `PATCH /api/usuarios/{id}/estado` | Activar/Inactivar (no se eliminan físicamente) |
| Dashboard admin | `/admin` vía frontend | Gestión de usuarios del sistema |

---

## 5. Motor de Enrutamiento (Core del Negocio)

Este es el diferenciador técnico más importante de la solución.

```
Equipaje ingresado → BC1 publica evento → BC2 recibe → MotorEnrutamiento
                                                          ↓
                                              ┌─────────────────────┐
                                              │ RoutingStrategy     │
                                              │ (Interface)         │
                                              ├─────────┬───────────┤
                                              │ Greedy  │ ACO       │
                                              │ (1 item)│ (N items) │
                                              └─────────┴───────────┘
                                                          ↓
                                              RutaResult (segmentos)
                                                          ↓
                                              BC1 persiste PlanViaje
```

### GreedyRoutingStrategy

- Busca **vuelo directo** origen → destino con carga disponible y llegada ≤ SLA
- Si no existe, busca **combinación de 2 vuelos** (escala) con mínimo 60 min de conexión
- **Determinista**, sin dependencias externas, testeable sin mocks
- `@Qualifier("greedyRoutingStrategy")`

### ACORoutingStrategy (Ant Colony Optimization)

- Procesa **lote completo** de equipajes en cada optimización
- Construye grafo en memoria desde los vuelos disponibles
- Ordena maletas por **urgencia SLA** (la que tiene menos tiempo primero)
- Parámetros del algoritmo:
  - ALPHA = 1.0 (importancia feromona)
  - BETA = 2.5 (importancia heuristico)
  - RHO = 0.20 (evaporación)
  - Q = 1,000,000 (depósito base)
  - ELITE_FACTOR = 3.0 (élitismo)
  - TAU_MIN = 0.1 / TAU_MAX = 10.0 (evitar estancamiento)
  - PENALIDAD_SLA_POR_HORA = 2,000.0
  - MAX_ITERACIONES = 10
  - NUM_HORMIGAS = 5
  - MAX_ESCALAS_BUSQUEDA = 6
- SLA **gradual**: penalidad proporcional a horas de retraso
- Verifica **alcanzabilidad** con BFS antes de asignar un vuelo
- `@Qualifier("acoRoutingStrategy")`, `soportaBatch() = true`

### MotorEnrutamiento (Orquestador)

```java
RutaResult calcularRuta(NodoLogistico origen, String destinoIata, OffsetDateTime slaComprometido)
List<RutaResult> calcularRutasLote(List<Equipaje> equipajes)
```

- **Modo single-item:** delega en GreedyRoutingStrategy
- **Modo batch:** delega en ACORoutingStrategy con TiempoInterno derivado

---

## 6. Ciclo de Vida del Equipaje

### Máquina de estados

```
REGISTRADO → ENRUTADO → EN_VUELO → EN_ALMACEN → ENTREGADO
                ↓
         EN_REPLANIFICACION → ENRUTADO | INCUMPLIMIENTO_SLA
```

### Estados del vuelo

```
PROGRAMADO → EN_RUTA → COMPLETADO
     ↓
  CANCELADO
```

### Reglas de negocio clave

| Regla | Descripción |
|---|---|
| Registro de equipaje | El campo `destino_iata` debe existir en nodos; el `vuelo_id` debe estar `PROGRAMADO`; ocupación del almacén no debe superar 100% |
| Origen autocompletado | El origen se autocompleta con el `nodo_ref_id` del operador autenticado (extraído del JWT) |
| Cancelación de vuelo | Solo PROGRAMADO o EN_RUTA pueden cancelarse |
| Eliminación de equipaje | Al eliminar, se libera carga del vuelo (`carga_disponible + 1`) |
| Replanificación | Si nueva ruta supera SLA → estado `INCUMPLIMIENTO_SLA` |
| SLA Calculator | Utilidad compartida que calcula SLA basado en continente: mismo continente = 24h, cross-continente = 48h |

---

## 7. Mapa Interactivo en Tiempo Real (Leaflet + React)

No es un mapa estático — es el centro de la experiencia del operador:

- **5 aeropuertos sudamericanos** (LIM, MIA, BOG, GRU, SCL) renderizados como marcadores en `GeoMapaNodo.tsx`
- **Aviones animados** (`AvionAnimado.tsx`) volando entre nodos con interpolación de posición usando curvas bezier
- **Código de colores** por ocupación: Verde (<70%), Ámbar (70-90%), Rojo (>90%)
- **Leyenda dinámica** (`GeoMapaLeyenda.tsx`) que se actualiza con cada tick
- **SSR desactivado** (`dynamic import, ssr: false`) porque Leaflet necesita el DOM del navegador
- **Mapa centrado** en Sudamérica: coordenadas [-15, -60], zoom 4
- **TileLayer** de OpenStreetMap

### Componentes del mapa

| Componente | Archivo | Función |
|---|---|---|
| GeoMapa | `components/mapa/GeoMapa.tsx` | Contenedor MapContainer con TileLayer |
| GeoMapaNodo | `components/mapa/GeoMapaNodo.tsx` | Marcador de aeropuerto con color |
| GeoMapaVuelo | `components/mapa/GeoMapaVuelo.tsx` | Línea de ruta entre origen y destino |
| AvionAnimado | `components/mapa/AvionAnimado.tsx` | Icono de avión que se mueve interpolando |
| GeoMapaLeyenda | `components/mapa/GeoMapaLeyenda.tsx` | Leyenda de colores verde/ámbar/rojo |

---

## 8. Paneles Operativos (Dashboard del Operador)

La pantalla `/operacion` no es un simple formulario — es un **centro de comando** con:

| Panel | Archivo | Qué muestra |
|---|---|---|
| Resumen de vuelos | `ResumenVuelosOperacion.tsx` | Totales: programados, activos por nodo |
| Panel de nodos | `PanelNodosOperacion.tsx` | Cada aeropuerto con ocupación %, capacidad, continente |
| Panel de vuelos | `PanelVuelosOperacion.tsx` | Vuelos activos con filtros y botón "Descargar Manifiesto PDF" |
| Envíos | `PanelEnviosOperacion.tsx` | Equipajes en tránsito, seleccionables para ver detalle |
| Entregados | `PanelEntregadosOperacion.tsx` | Historial de entregas recientes |
| Métricas de operación | `MetricasOperacion.tsx` | Contadores en vivo (11 indicadores) |
| Notificaciones toast | Integrado en `page.tsx` | Alertas visuales FIFO, auto-dismiss, máx 3 visibles |
| Indicadores conectividad | Integrado en `page.tsx` | SSE + WebSocket + Operación (verde/rojo) |
| Botón On/Off | Integrado en `page.tsx` | Activar o detener toda la operación vía `POST /api/operacion/toggle` |

### Métricas de Operación (MetricasOperacion)

```typescript
interface MetricasOperacion {
  total_equipajes: number;
  equipajes_registrados: number;
  equipajes_en_vuelo: number;
  equipajes_en_almacen: number;
  equipajes_entregados: number;
  equipajes_replanificacion: number;
  equipajes_incumplimiento_sla: number;
  vuelos_programados: number;
  vuelos_en_ruta: number;
  vuelos_completados: number;
  vuelos_cancelados: number;
}
```

---

## 9. Carga Masiva de Equipaje

Un flujo pensado para operaciones de alto volumen en **2 pasos**:

1. **Subir CSV** con formato: `destino_iata, cantidad`
2. **Preview de validación**: El backend analiza cada fila y devuelve:
   - Válidos (verde) vs. Con revisión (amarillo, con motivo)
   - Tabla interactiva en el modal con scroll
3. **Confirmación selectiva**: Solo se ingresan los registros válidos vía confirmación al backend

### Contratos API

```
POST /api/equipajes/carga-masiva (multipart/form-data, campo "archivo" .csv)
→ PreviewResponse { total, validos, con_revision, registros[] }

POST /api/equipajes/carga-masiva/confirmar
→ { ingresados: number, fallidos: number }
```

---

## 10. Sesiones de Simulación

### Estados y ciclo de vida

```
CONFIGURADA → EN_CURSO → PAUSADA ↔ EN_CURSO
                                ↓
                           FINALIZADA
                                ↓
                           COLAPSADA (por sobrecapacidad crítica)
```

### Tipos de sesión

| Tipo | Descripción |
|---|---|
| **SIMULADA** | Trabaja con copia virtual del PlanVuelos. No afecta datos reales. Múltiples en paralelo. |
| **EN_VIVO** | Opera sobre datos reales. Solo una activa a la vez. |

### Parámetros configurables (desde la UI)

| Parámetro | Tipo | Rango/Default | Descripción |
|---|---|---|---|
| `fecha_inicio_virtual` | date | Libre | Fecha virtual de inicio |
| `hora_inicio_virtual` | time | 08:00 | Hora virtual de inicio |
| `prob_cancelacion` | slider | 0-100%, default 15% | Probabilidad de cancelación por tick |
| `k` | implícito | 120-240 | Factor tiempo virtual/real (120=60min real) |
| `umbrales_almacen` | 2 números | verde_max 70%, ambar_max 90% | Verde/Ámbar/Rojo para almacenes |
| `umbrales_vuelo` | 2 números | verde_max 75%, ambar_max 90% | Verde/Ámbar/Rojo para vuelos |

### Detección de sesiones activas

El frontend al cargar `/simulacion` consulta:
- Sesiones EN_CURSO → muestra botón "Reanudar"
- Sesiones PAUSADAS → muestra botón "Continuar"
- Permite finalizar sesiones colgadas directamente

---

## 11. Arquitectura de Tiempo Real (3 Canales)

El sistema usa **3 mecanismos de comunicación en vivo**:

| Canal | Tecnología | Frecuencia | Propósito |
|---|---|---|---|
| **WebSocket** | `ws://host/api/ws/telemetria?token=` | Cada ~5s | Posición de aviones, ocupación de nodos, métricas de sesión |
| **SSE** | `GET /api/eventos/planificacion?token=` | Eventos | Planificación completada/fallida, cancelaciones, fin de sesión |
| **Polling HTTP** | `GET /api/sesiones/{id}/metricas` | Cada 3s | Fallback cuando WebSocket se desconecta |

### Estrategia de reconexión

- WebSocket es la **fuente principal**
- Si se desconecta → se activa **polling como fallback**
- Al reconectarse → el polling se **detiene automáticamente**
- Reconexión con **backoff exponencial**: 3s → 6s → 12s → max 30s

### Eventos SSE

| event | Disparo | data |
|---|---|---|
| `planificacion` | Cada tick de simulación (~5s) | Payload de métricas |
| `planificacion-completada` | Equipaje planificado exitosamente | id_externo, tipo |
| `planificacion-fallida` | Fallo al planificar equipaje | id_externo, error |
| `cancelacion` | Un vuelo es cancelado | vuelo_id, causa, equipajes_afectados |
| `replanificacion` | Lote de equipajes replanificado | lote_id, equipajes, sesion_id |
| `sesion_terminada` | La sesión finaliza | sesion_id, reporte_url |
| `heartbeat` | Cada 30s | timestamp |

### Mensaje WebSocket (Telemetría)

```json
{
  "timestamp": "2025-06-10T09:05:00Z",
  "nodos": [{ "id": "uuid", "codigo_iata": "LIM", "lat": -12.0219,
             "lon": -77.1143, "ocupacion_pct": 75.4, "color": "AMBAR" }],
  "vuelos": [{ "id": "uuid", "codigo_vuelo": "LA2401", "estado": "EN_RUTA",
               "lat_actual": -8.5, "lon_actual": -70.2, "ocupacion_pct": 60.0,
               "color": "VERDE", "progreso": 0.45 }],
  "metricas_sesion": { "sesion_id": "uuid", "sla_acumulado_pct": 97.2,
                       "vuelos_cancelados": 1, "maletas_replanificadas": 5 }
}
```

---

## 12. Reporte Final con Gráfico SLA

### Componentes

Usa **Recharts** (LineChart) en `simulacion/[id]/reporte/page.tsx`:
- **Eje X:** Momento virtual (días comprimidos)
- **Eje Y:** SLA % (0-100%)
- **Marcadores rojos:** Puntos donde `hubo_cancelacion = true`
- **Serie temporal** de puntos SLA registrados cada hora virtual

### Datos clave del reporte

```json
{
  "sesion_id": "uuid",
  "sla_incumplido_pct": 5.7,
  "total_replanificadas": 18,
  "punto_colapso_virtual": null,
  "nodo_colapso_ref_id": null,
  "causa_colapso": null,
  "serie_sla": [
    { "momento_virtual": "2025-06-01T08:00:00Z", "sla_pct": 100.0, "hubo_cancelacion": false },
    { "momento_virtual": "2025-06-01T14:00:00Z", "sla_pct": 96.5, "hubo_cancelacion": true,
      "vuelo_cancelado_ref_id": "uuid-vuelo" }
  ]
}
```

### Componentes UI del reporte

- `Suspense` boundary para carga asíncrona
- Tarjetas de resumen: SLA incumplido %, total replanificadas, punto/causa de colapso
- Botón para descargar rutas CSV

---

## 13. Seguridad y Autenticación JWT

### Claims del token

```json
{
  "id": "uuid",
  "correo": "operador@tasfb2b.com",
  "rol": "OPERADOR_LOGISTICO",
  "nodo_ref_id": "uuid-nodo-LIM"
}
```

### Características

| Característica | Detalle |
|---|---|
| **Origen autocompletado** | El `nodo_ref_id` del JWT define el nodo origen del operador |
| **Token en query param** | El JwtFilter reconoce token en `?token=` además de `Authorization: Bearer` (necesario para SSE) |
| **Roles protegidos** | `@PreAuthorize` y `SecurityConfig` con `requestMatchers` por endpoint |
| **Contraseñas** | Hash BCrypt, nunca texto plano |
| **Expiración** | Configurable vía `jwt.expiration` (default 24h) |
| **CORS** | Configurado para localhost:3000, 5000, 8080 y URL de producción |
| **Stateless** | Sin sesiones HTTP, cada request lleva su token |

### Matriz de control de acceso

| Endpoint | ADMIN | OPERADOR | ANALISTA |
|---|---|---|---|
| `/auth/**` | ✓ | ✓ | ✓ |
| `/usuarios/**` | ✓ | — | — |
| `/equipajes/**` | — | ✓ | — |
| `GET /vuelos` | ✓ | ✓ | ✓ |
| `POST /vuelos` | — | ✓ | — |
| `/sesiones/**` | — | — | ✓ |
| `/eventos/**` | — | — | ✓ |
| `/nodos/**` | ✓ | ✓ | ✓ |
| `/simulacion/cancelacion` | — | ✓ | — |
| `/health` | ✓ | ✓ | ✓ |

---

## 14. Base de Datos y Caché

### PostgreSQL — Tablas

| BC | Tabla | Propósito |
|---|---|---|
| BC3 | `roles` | 3 roles con permisos JSON |
| BC3 | `usuarios` | Cuentas con hash BCrypt, intentos fallidos, nodo asignado |
| BC3 | `entradas_auditoria` | Inmutable — solo INSERT de acciones relevantes |
| BC1 | `plan_vuelos` | Catálogo de planes de vuelo |
| BC1 | `nodos_logisticos` | 5 aeropuertos con lat/lon y capacidad de almacén |
| BC1 | `vuelos` | Vuelos con coordenadas origen/destino y capacidad de carga |
| BC1 | `equipajes` | Estado, SLA, destino, origen, cantidad |
| BC1 | `planes_viaje` | Ruta asignada con ubicación actual (NODO/VUELO) |
| BC1 | `segmentos_plan` | Tramos individuales del viaje (orden, vuelo, horario) |
| BC2 | `sesiones_ejecucion` | Configuración + métricas embebidas (15+ columnas) |
| BC2 | `eventos_cancelacion` | Registro de cada cancelación (fuente, causa, tiempo virtual) |
| BC2 | `lotes_replanificacion` | Agrupación de equipajes afectados por cancelación |
| BC2 | `items_lote` | Equipaje individual dentro de un lote de replanificación |
| BC2 | `reportes_sesion` | Reporte final inmutable |
| BC2 | `puntos_sla` | Serie temporal para el gráfico SLA vs Tiempo |

### Convenciones

| Convención | Detalle |
|---|---|
| IDs | UUID v4 generados en aplicación (no BD) |
| Timestamps | TIMESTAMPTZ (con zona horaria) |
| Enums | VARCHAR(50) con CHECK constraint |
| Soft delete | No se elimina físicamente — se usa campo `estado` |
| Migraciones | Flyway — un archivo por tabla, prefijo V{n}__nombre.sql |

### Redis — Caché

| Clave | Tipo | Valor | Escrito por |
|---|---|---|---|
| `nodo:{id}:ocupacion` | String | INT | BC1 al confirmar / BC2 al replanificar |
| `vuelo:{id}:carga_disponible` | String | INT | BC1 al confirmar / BC2 al replanificar |
| `sesion:{id}:metricas` | String | JSON de MetricasEnVivo | BC2 en cada tick |
| `sesion:{id}:estado` | String | Estado de sesión | BC2 al cambiar estado |

> Redis es caché de lectura rápida. La fuente de verdad siempre es PostgreSQL.
> Si Redis cae, los valores se reconstruyen leyendo PostgreSQL.

### Índices

```sql
CREATE INDEX idx_equipajes_estado ON equipajes(estado);
CREATE INDEX idx_vuelos_estado ON vuelos(estado);
CREATE INDEX idx_vuelos_hora_salida ON vuelos(hora_salida);
CREATE INDEX idx_segmentos_plan_viaje ON segmentos_plan(plan_viaje_id);
CREATE INDEX idx_items_lote ON items_lote(lote_id);
CREATE INDEX idx_puntos_sla_reporte ON puntos_sla(reporte_id, momento_virtual);
CREATE INDEX idx_auditoria_usuario ON entradas_auditoria(usuario_id, ocurrido_en);
```

---

## 15. Motor de Simulación por Ticks (TickService)

Ejecutado cada **5 segundos reales** vía `@Scheduled`. En cada tick:

```
1. Avanzar reloj virtual (OffsetDateTime diaHoraVirtual)
2. Detectar vuelos que deben salir (PROGRAMADO → EN_RUTA)
3. Detectar vuelos que deben llegar (EN_RUTA → COMPLETADO)
4. Actualizar estados de equipajes:
   - Si vuelo sale → equipajes EN_ALMACEN → EN_VUELO
   - Si vuelo llega → equipajes EN_VUELO → EN_ALMACEN
5. Evaluar probabilidad de cancelación (Random vs prob_cancelacion)
6. Si hay cancelación → generar EventoCancelacion + LoteReplanificacion
7. Actualizar métricas en Redis
8. Registrar PuntoSLA cada hora virtual
9. Emitir telemetría vía WebSocket con TelemetriaService
```

### Factores de escala

| k | Tiempo real para 5 días virtuales |
|---|---|
| 120 | ~60 minutos |
| 240 | ~30 minutos |

---

## 16. Mecanismos de Concurrencia

### SesionLockManager

- Evita que dos hilos procesen la misma sesión simultáneamente
- Previene condiciones de carrera en el tick de simulación

### SesionReadinessManager

- Prepara datos antes de iniciar una sesión
- Clona el PlanVuelos para modo SIMULADA
- Establece fechas virtuales iniciales

### Reglas de concurrencia

| Regla | Descripción |
|---|---|
| Una sesión EN_VIVO activa | Solo puede existir una a la vez |
| Múltiples SIMULADAS | Pueden correr en paralelo sin interferirse |
| Datos virtuales | SIMULADA no afecta el estado real de vuelos ni equipajes |
| No reinicio | Sesión FINALIZADA o COLAPSADA no puede reiniciarse |
| Cohorte de sesiones | Las sesiones activas se manejan con ConcurrentHashMap |

---

## 17. Cadena de Eventos de Dominio

Todos los eventos viven en `shared/events/` y se comunican vía `ApplicationEventPublisher` de Spring.

### Eventos publicados

| Evento | BC Origen | Cuándo se publica | Quién escucha |
|---|---|---|---|
| `EquipajeIngresadoEvent` | BC1 | Al confirmar registro de equipaje | BC2 → MotorEnrutamiento |
| `EquipajePlanificadoEvent` | BC1 | Equipaje asignado a cola de planificación | BC2 |
| `VueloCanceladoEvent` | BC1 | Al cancelar vuelo manualmente | BC2 → ReplanificacionService |
| `PlanViajeCreado` | BC2 | Ruta calculada exitosamente | BC1 → persiste PlanViaje |
| `UbicacionActualizadaEvent` | BC1 | Equipaje avanza al siguiente segmento | Telemetría |
| `ReplanificacionIniciada` | BC2 | Lote creado y procesándose | Auditoría/Telemetría |
| `SesionFinalizada` | BC2 | Sesión completada o detenida | Auditoría |

---

## 18. Manejo de Errores Global

### GlobalExceptionHandler (`@RestControllerAdvice`)

Captura 10+ tipos de excepción con códigos HTTP específicos:

| Excepción | HTTP | Código error |
|---|---|---|
| `MethodArgumentNotValidException` | 400 | VALIDACION_FALLIDA |
| `HttpMessageNotReadableException` | 400 | JSON_INVALIDO |
| `IllegalArgumentException` | 400 | ARGUMENTO_INVALIDO |
| `ValidacionException` (Equipaje) | 422 | VALIDACION |
| `CancelacionInvalidaException` | 400 | CANCELACION_INVALIDA |
| `VueloNoEncontradoException` | 404 | VUELO_NO_ENCONTRADO |
| `EquipajeNoEncontradoException` | 404 | EQUIPAJE_NO_ENCONTRADO |
| `CorreoYaExisteException` | 409 | CORREO_YA_EXISTE |
| `ManifiestoVacioException` | 422 | MANIFIESTO_VACIO |
| `DataAccessException` | 500 | ERROR_BD |
| `Exception` (general) | 500 | ERROR_INTERNO |

### Estructura de respuesta de error

```json
{
  "timestamp": "2025-06-10T09:05:00Z",
  "status": 422,
  "error": "CAPACIDAD_SUPERADA",
  "mensaje": "La confirmación del ingreso superaría el 100% de capacidad del almacén LIM.",
  "path": "/api/equipajes"
}
```

---

## 19. Animación de Aviones y Notificaciones

### Avión Animado (`AvionAnimado.tsx`)

- Icono de avión que se mueve entre nodo origen y destino
- Interpolación de posición usando curvas bezier (`lib/bezier.ts`)
- Velocidad controlada por factor `k`
- Solo visible cuando estado del vuelo = `EN_RUTA`

### Sistema de Notificaciones (Toast)

- **FIFO** con máximo 3 notificaciones visibles simultáneas
- **Auto-dismiss**: 5s (éxito/error), 8s (eventos especiales), persistente (sesión terminada)
- **Tipos**: success (verde), error (rojo)
- **Eventos**: planificación completada, planificación fallida, cancelación, replanificación, sesión terminada
- Botón de acción en notificación de sesión terminada: "Ver Reporte"

---

## 20. Filtros y Ordenamiento en Paneles

### Panel de Vuelos (PanelVuelos.tsx + PanelVuelosOperacion.tsx)

| Filtro/Orden | Tipo | Descripción |
|---|---|---|
| Filtro por código | Text input | Búsqueda por código de vuelo |
| Filtro por origen | Select dinámico | Generado de datos actuales |
| Filtro por destino | Select dinámico | Generado de datos actuales |
| Orden por ocupación ↑ | Select | Menor ocupación primero |
| Orden por ocupación ↓ | Select | Mayor ocupación primero |
| Orden por hora salida | Select | Más temprano primero |
| Orden por hora llegada | Select | Más temprano primero |
| Orden origen/destino A-Z | Select | Alfabético |

### Panel de Nodos (PanelNodos.tsx + PanelNodosOperacion.tsx)

| Filtro/Orden | Tipo | Descripción |
|---|---|---|
| Filtro por código IATA | Text input | Búsqueda parcial |
| Filtro por continente | Select dinámico | Agrupación geográfica |
| Orden por ocupación ↑↓ | Select | Porcentaje de ocupación |
| Orden salida/llegada UT | Select | Tiempos de vuelos asociados |

### Límite de renderizado

```typescript
const MAX_RENDER = 100; // Evita saturar el DOM con miles de vuelos PROGRAMADO
```

---

## 21. Valor Agregado Técnico

| Concepto | Por qué importa |
|---|---|
| **Simulación 5 días comprimidos** | Permite a analistas probar escenarios "qué pasaría si..." sin afectar operación real |
| **Dos modos: SIMULADA y EN_VIVO** | Pueden correr en paralelo sin interferirse |
| **Notificaciones SSE en tiempo real** | Cancelaciones, replanificaciones, fin de sesión aparecen como toasts |
| **Umbrales configurables** | Verde/Ámbar/Rojo tanto para almacenes como para vuelos |
| **WebSocket para telemetría** | Mapa en vivo con posiciones de vuelos y colores de ocupación |
| **Arquitectura DDD** | Código mantenible, cada bounded context es independiente y testeable |
| **Carga masiva con preview** | Validación previa a la confirmación, evita errores en lote |
| **ACO vs Greedy** | Estrategia dual: simple para 1 item, inteligente para lotes |
| **Cola de planificación** | Buffer ordenado por SLA, proceso batch de 50 items |
| **Manifiesto PDF** | Documento descargable por vuelo con equipajes asignados |
| **Data seeder** | Demo ready desde el primer arranque (3 usuarios, 5 nodos, 10 vuelos) |
| **Error handling estructurado** | Códigos HTTP específicos, respuesta JSON uniforme |
| **BackPrefixFilter** | Deployable detrás de proxy inverso |
| **Timeout en API client** | 15 segundos con AbortController |
| **Validación runtime** | Fallback seguro para estados desconocidos del backend |

---

## 22. Propuesta de Diapositivas

| # | Diapositiva | Contenido |
|---|---|---|
| 1 | **Portada** | TAS FB2B: Sistema de Gestión Logística de Equipaje |
| 2 | **El Problema** | Logística de equipaje, maletas perdidas, falta de visibilidad |
| 3 | **La Solución de Alto Nivel** | Enrutamiento óptimo + simulación + monitoreo + replanificación |
| 4 | **Arquitectura General** | Diagrama de 3 capas (Frontend / API / BD) con DDD |
| 5 | **Bounded Contexts (DDD)** | BC1 Gestión / BC2 Planificación / BC3 Identidad |
| 6 | **Funcionalidades por Rol** | Tablas: OPERADOR (12 func.), ANALISTA (10 func.), ADMIN (2 func.) |
| 7 | **Motor de Enrutamiento** | Diagrama: Greedy + ACO con parámetros y flujo |
| 8 | **Ciclo de Vida del Equipaje** | Máquina de estados con 7 estados |
| 9 | **Simulación de 5 Días** | Parámetros, ticks, cancelaciones aleatorias, factor de escala |
| 10 | **Mapa Interactivo** | Captura de Leaflet con nodos, aviones y leyenda de colores |
| 11 | **Dashboard del Operador** | Captura del panel derecho con todos los paneles |
| 12 | **Carga Masiva** | Flujo CSV → Preview → Confirmar (con tabla válidos/revisión) |
| 13 | **3 Canales en Tiempo Real** | Diagrama: WebSocket + SSE + Polling con backoff exponencial |
| 14 | **Reporte Final** | Captura del gráfico Recharts SLA vs Tiempo |
| 15 | **Seguridad JWT** | Claims, roles, CORS, token en query param para SSE |
| 16 | **Esquema de Base de Datos** | Diagrama ER con 15 tablas + Redis |
| 17 | **Arquitectura de Eventos** | Cadena de 7 eventos de dominio entre BCs |
| 18 | **Tecnologías** | Next.js 16 / Spring Boot 3 / PostgreSQL / Redis / Leaflet |
| 19 | **Demo en Vivo** | Timeline completa: login → registrar equipaje → simular → reporte |
| 20 | **Conclusiones** | Impacto, escalabilidad, trabajo futuro |

---

## Apéndice: Seed Inicial (Demo Ready)

### Roles

| nombre | permisos |
|---|---|
| ADMINISTRADOR | `["USUARIOS_WRITE","USUARIOS_READ","VUELOS_READ","NODOS_READ"]` |
| OPERADOR_LOGISTICO | `["EQUIPAJES_WRITE","VUELOS_READ","NODOS_READ","MANIFIESTOS_READ","CANCELACION_WRITE"]` |
| ANALISTA | `["SESIONES_WRITE","SESIONES_READ","VUELOS_READ","NODOS_READ"]` |

### Usuarios de prueba

| nombre | correo | contraseña | rol |
|---|---|---|---|
| Admin Sistema | admin@tasfb2b.com | admin123 | ADMINISTRADOR |
| Operador Lima | operador@tasfb2b.com | operador123 | OPERADOR_LOGISTICO |
| Analista Sim | analista@tasfb2b.com | analista123 | ANALISTA |

### Nodos logísticos

| código IATA | nombre | latitud | longitud | capacidad_almacén |
|---|---|---|---|---|
| LIM | Aeropuerto Jorge Chávez | -12.0219 | -77.1143 | 500 |
| MIA | Miami International | 25.7959 | -80.2870 | 800 |
| BOG | El Dorado | 4.7016 | -74.1469 | 600 |
| GRU | São Paulo Guarulhos | -23.4356 | -46.4731 | 700 |
| SCL | Arturo Merino Benítez | -33.3930 | -70.7858 | 400 |

---

> Documento generado automáticamente a partir de la revisión completa del repositorio
> TAS FB2B — Proyecto PDDS 412
> Última actualización: Junio 2026
