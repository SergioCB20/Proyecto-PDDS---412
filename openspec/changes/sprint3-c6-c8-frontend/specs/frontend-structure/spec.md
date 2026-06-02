## MODIFIED Requirements

### Requirement: Middleware de protección de rutas (`middleware.ts`)

The middleware SHALL be implemented as `frontend/middleware.ts` (the standard Next.js middleware file). The previous `frontend/proxy.ts` file SHALL be removed as Next.js does not recognize it as middleware.

The middleware SHALL protect routes based on JWT role (ADMINISTRADOR, OPERADOR_LOGISTICO, ANALISTA) and redirect unauthenticated users to `/login`.

#### Scenario: Middleware blocks unauthenticated access
- **WHEN** an unauthenticated user accesses `/admin`, `/operacion`, or `/simulacion`
- **THEN** the middleware SHALL redirect to `/login`

#### Scenario: Middleware allows access by role
- **WHEN** an authenticated user with role `OPERADOR_LOGISTICO` accesses `/operacion`
- **THEN** the middleware SHALL allow the request to proceed

#### Scenario: Middleware redirects unauthorized role
- **WHEN** an authenticated user with role `ANALISTA` accesses `/operacion`
- **THEN** the middleware SHALL redirect to `/simulacion` (the first allowed route for ANALISTA)
