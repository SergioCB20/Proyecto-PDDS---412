# Design: Backend Fases 1-3 — TAS FB2B

## Architecture

### Stack Tecnologico

- Spring Boot 4 + Java 21
- PostgreSQL 16 (Flyway migrations)
- Redis 7 (caché, no usado en estas fases)
- JWT (jjwt 0.12.x) para autenticacion
- springboot3-dotenv para lectura de .env

### Estructura de Paquetes

```
com.tasfb2b.backend/
├── bc3/
│   ├── domain/          (Usuario, Rol, EntradaAuditoria)
│   ├── application/     (AuthService, UsuarioService)
│   └── infrastructure/  (Controllers, Repositories, DataSeeder)
├── bc1/
│   ├── domain/          (Equipaje, PlanViaje, SegmentoPlan, Vuelo, NodoLogistico, PlanVuelos)
│   ├── application/     (EquipajeService, VueloService, NodoService, CancelacionService)
│   └── infrastructure/  (Controllers, Repositories)
└── shared/
    └── security/        (JwtUtil, JwtFilter, SecurityConfig)
```

### Base de Datos

**Tablas BC3:**
- `roles` — ADMINISTRADOR, OPERADOR_LOGISTICO, ANALISTA
- `usuarios` — con FK a roles, BCrypt password
- `entradas_auditoria` — inmutable

**Tablas BC1:**
- `plan_vuelos` — catalogo unico
- `nodos_logisticos` — 5 nodos (LIM, MIA, BOG, GRU, SCL)
- `vuelos` — 10 vuelos entre nodos
- `planes_viaje` — uno por equipaje
- `equipajes` — registro de equipaje
- `segmentos_plan` — segmentos de ruta

### API Endpoints

| Metodo | Path | Rol | Descripcion |
|--------|------|-----|-------------|
| POST | /api/auth/login | publico | Login, devuelve JWT |
| GET | /api/usuarios | ADMIN | Listar usuarios |
| POST | /api/usuarios | ADMIN | Crear usuario |
| PUT | /api/usuarios/{id} | ADMIN | Modificar usuario |
| PATCH | /api/usuarios/{id}/estado | ADMIN | Activar/inactivar |
| GET | /api/nodos | todos | Lista nodos |
| GET | /api/vuelos | todos | Lista/filtrar vuelos |
| POST | /api/equipajes | OPERADOR | Registrar equipaje |
| GET | /api/equipajes/{id}/plan-viaje | OPERADOR | Consultar ruta |
| POST | /api/simulacion/cancelacion | OPERADOR | Cancelar vuelo |

### Seed de Datos

Seeds en `DataSeeder.java` (Component con @EventListener(ApplicationReadyEvent)):
- BC3: 3 roles + 3 usuarios (admin, operador, analista)
- BC1: 1 plan_vuelos + 5 nodos + 10 vuelos

### Security

- Spring Security con JWT
- Endpoints publicos: `/health`, `/api/auth/**`
- Filtro JwtFilter intercepta cada request y valida token
- RBAC por anotaciones de rol en SecurityConfig