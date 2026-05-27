# TAS FB2B — Sistema de Gestión Logística de Equipaje

Sistema académico para el enrutamiento óptimo de equipaje entre aeropuertos, con simulación de escenarios logísticos y monitoreo en tiempo real.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 + TypeScript 5 + Tailwind CSS 4 |
| Backend | Spring Boot 3 + Java 21 |
| Base de datos | PostgreSQL 16 + Flyway |
| Caché | Redis 7 (planeado) |
| Autenticación | JWT (jjwt 0.12.x) |
| Mapas | React-Leaflet + Leaflet |

## Estructura del repositorio

```
/
├── backend/backend/          → Proyecto Spring Boot (Maven)
│   ├── pom.xml
│   ├── src/main/java/com/tasfb2b/backend/
│   │   ├── shared/           → Cross-cutting (events, security, health)
│   │   ├── bc1/              → Gestion Operativa (Equipaje, Vuelos, Nodos)
│   │   └── bc3/              → Identidad y Acceso (Usuarios, Auth, Auditoria)
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── db/migration/     → 11 migraciones Flyway (V1-V11)
│   └── .env.example
├── frontend/                  → Proyecto Next.js
│   ├── app/                  → App Router (login, admin, operacion, simulacion)
│   ├── components/           → UI, mapa, navbar
│   ├── lib/                  → api, auth, types, mock
│   ├── middleware.ts         → Protección de rutas por rol
│   ├── next.config.ts
│   └── package.json
├── openspec/specs/           → Fuente de verdad compartida
│   ├── database-schema.md
│   ├── api-contracts.md
│   ├── bc1-gestion-operativa.md
│   ├── bc2-planificacion-replanificacion.md
│   ├── bc3-identidad-acceso.md
│   └── frontend-structure.md
├── openspec/changes/         → Archivo de cambios (change proposals)
├── prototipo/                → Mockups UI (PNG)
├── README.md
└── AGENTS.md
```

## Arquitectura del backend (DDD)

### shared/
- `BackendApplication.java` — Entry point
- `GlobalExceptionHandler.java` — `@RestControllerAdvice`
- `HealthController.java` — `GET /health`
- `events/` — `EquipajeIngresadoEvent`, `VueloCanceladoEvent`, `UbicacionActualizadaEvent`
- `security/` — `JwtUtil`, `JwtFilter`, `SecurityConfig`

### bc1/ — Gestión Operativa (~85% completo)
- **Domain:** `Equipaje`, `Vuelo`, `NodoLogistico`, `PlanViaje`, `PlanVuelos`, `SegmentoPlan`
- **Enums:** `EstadoEquipaje`, `EstadoVuelo`, `EstadoSegmento`, `EstadoSla`, `UbicacionTipo`
- **Services:** `EquipajeService`, `CancelacionService`, `NodoService`, `VueloService`
- **Controllers:** `EquipajeController`, `CancelacionController`, `VueloController`, `NodoController`

### bc3/ — Identidad y Acceso (100% completo)
- **Domain:** `Usuario`, `Rol`, `EntradaAuditoria`, `EstadoUsuario`
- **Services:** `AuthService`, `UsuarioService`
- **Controllers:** `AuthController`, `UsuarioController`
- **Seed:** `DataSeeder` — roles, 3 usuarios de prueba, plan de vuelos inicial

### bc2/ — Planificación y Replanificación (~95% completo)
- **Domain:** `SesionEjecucion`, `EventoCancelacion`, `LoteReplanificacion`, `ItemLote`, `ReporteSesion`, `PuntoSLA`, `EstadoLote`, `EstadoReplanificacion`, `EstadoSesion`, `TipoSesion`
- **Services:** `SesionService`, `MotorEnrutamiento`, `ReplanificacionService`, `ReporteService`, `TickService`, `TelemetriaService`
- **Controllers:** `SesionController`, `MetricasController`
- **WebSocket:** `TelemetriaWebSocket`

## API REST

| Método | Path | Rol |
|---|---|---|
| POST | `/api/auth/login` | Público |
| GET/POST | `/api/usuarios[/{id}]` | ADMINISTRADOR |
| PATCH | `/api/usuarios/{id}/estado` | ADMINISTRADOR |
| GET | `/api/nodos` | Autenticado |
| GET | `/api/vuelos` | Autenticado |
| POST | `/api/equipajes` | OPERADOR_LOGISTICO |
| POST | `/api/equipajes/carga-masiva` | OPERADOR_LOGISTICO |
| POST | `/api/equipajes/carga-masiva/confirmar` | OPERADOR_LOGISTICO |
| GET | `/api/manifiestos/{vuelo_id}` | OPERADOR_LOGISTICO |
| POST | `/api/sesiones` | ANALISTA |
| GET | `/api/sesiones/{id}/metricas` | ANALISTA |
| GET | `/api/sesiones/{id}/reporte` | ANALISTA |
| GET | `/health` | Público |

## Frontend — App Router

| Ruta | Vista | Rol |
|---|---|---|
| `/login` | Login | Público |
| `/admin` | CRUD usuarios | ADMINISTRADOR |
| `/operacion` | Mapa operativo | OPERADOR_LOGISTICO |
| `/simulacion` | Configurar simulación | ANALISTA |
| `/simulacion/[id]` | Simulación en vivo | ANALISTA |

## Usuarios de prueba

| Correo | Contraseña | Rol |
|---|---|---|
| admin@tasfb2b.com | admin123 | ADMINISTRADOR |
| operador@tasfb2b.com | operador123 | OPERADOR_LOGISTICO |
| analista@tasfb2b.com | analista123 | ANALISTA |

## Convenciones

- **Commits:** `feat:`, `fix:`, `chore:`, `refactor:`
- **Ramas:** `backend/*`, `frontend/*` desde `main`
- **PRs:** Siempre a `main`, revisados por otro miembro
- **Specs primero:** Antes de implementar, leer `openspec/specs/` correspondiente
- **Frontend:** Usar `@/` alias, componentes en `components/ui/`, Tailwind CSS clases utilitarias
- **Backend:** DDD con bounded contexts, eventos publicados con `ApplicationEventPublisher`, acceso por roles via `@PreAuthorize`
