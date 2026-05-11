# Tasks: Frontend TAS FB2B — 3 Vistas + Login

## Fase 0 — Base (6 tareas)

- [x] 0.1 Instalar dependencias: `npm install react-leaflet leaflet lucide-react` + `npm install @types/leaflet --save-dev`
- [x] 0.2 Crear archivo `frontend/.env.local` con `NEXT_PUBLIC_API_URL=http://localhost:8080/api`
- [x] 0.3 Crear `frontend/lib/types.ts` — todos los tipos TypeScript (Usuario, Nodo, Vuelo, Equipaje, LoginResponse, etc.)
- [x] 0.4 Crear `frontend/lib/api.ts` — cliente HTTP con fetch + Bearer token + manejo de errores
- [x] 0.5 Crear `frontend/lib/auth.ts` — getToken, setToken, clearToken, logout, getUser, getRol
- [x] 0.6 Crear `frontend/middleware.ts` — proteger rutas /admin, /simulacion, /operacion segun rol

## Fase 1 — Layout + Login (5 tareas)

- [x] 1.1 Actualizar `frontend/app/layout.tsx` — agregar Navbar con logo TAS, nombre usuario, logout
- [x] 1.2 Actualizar `frontend/app/page.tsx` — redirect: sin token → /login, con token → segun rol
- [x] 1.3 Crear `frontend/app/login/page.tsx` — formulario correo + password, POST /auth/login, guardar token + user
- [x] 1.4 Crear componentes UI base: Button, Input, Card, Badge (en `components/ui/`)
- [x] 1.5 Crear componente Modal (en `components/ui/Modal.tsx`)

## Fase 2 — Admin (6 tareas)

- [x] 2.1 Crear `frontend/app/admin/page.tsx` — titulo + tabla de usuarios con headers
- [x] 2.2 Implementar paginacion en tabla (10 por pagina, controles prev/next)
- [x] 2.3 Implementar busqueda por nombre/correo (filtrado local)
- [x] 2.4 Modal crear usuario: campos nombre, correo, password, rol (select)
- [x] 2.5 Modal editar usuario: campo nombre (solo editable)
- [x] 2.6 Modal confirmar inactivar/activar + conectar a PATCH /api/usuarios/{id}/estado

## Fase 3 — Mapa Geoespacial (6 tareas)

- [x] 3.1 Crear `frontend/components/mapa/GeoMapa.tsx` — mapa base Leaflet con OpenStreetMap, centro America del Sur
- [x] 3.2 Crear `frontend/components/mapa/GeoMapaNodo.tsx` — circulo + label IATA con color segun ocupacion
- [x] 3.3 Crear `frontend/components/mapa/GeoMapaVuelo.tsx` — polyline + icono avion animado en posicion interpolada
- [x] 3.4 Crear `frontend/components/mapa/GeoMapaLeyenda.tsx` — leyenda visual: verde/amarillo/rojo
- [x] 3.5 Componer GeoMapa con nodos y vuelos como props reutilizables
- [x] 3.6 Crear `frontend/lib/mock.ts` — 5 nodos con posiciones reales + 10 vuelos mock

## Fase 4 — Simulacion (6 tareas)

- [x] 4.1 Crear `frontend/app/simulacion/page.tsx` — formulario config: fecha, hora, prob_cancelacion, umbrales
- [x] 4.2 Generar ID mock y redirect a /simulacion/[id] al iniciar
- [x] 4.3 Crear `frontend/app/simulacion/[id]/page.tsx` — layout: mapa (izq) + panel lateral (der)
- [x] 4.4 Panel lateral: tarjetas metricas (dia/hora virtual, SLA%, vuelos cancelados, replanificadas)
- [x] 4.5 Botones controlar simulacion: Iniciar | Pausar | Detener (mock, sin backend)
- [x] 4.6 Crear `frontend/hooks/useMetricasMock.ts` + `useVuelosAnimados.ts`

## Fase 5 — Operacion (4 tareas)

- [x] 5.1 Crear `frontend/app/operacion/page.tsx` — layout: mapa (izq) + panel lateral (der)
- [x] 5.2 Panel lateral: tarjeta "Equipajes Recientes" con ultimos 10 registros
- [x] 5.3 Conectar a GET /nodos, GET /vuelos del backend existente
- [x] 5.4 Implementar polling cada 5s para datos en vivo (preparado para Redis)

## Resumen

- Total tareas: 27
- Completadas: 27
- Pendientes: 0