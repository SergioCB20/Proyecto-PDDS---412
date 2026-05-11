# Tareas del Equipo Frontend — TAS FB2B

> Archivo generado a partir de `TAREAS_EQUIPO.md` con las tareas específicas para la persona encargada del frontend del proyecto **TAS FB2B — Sistema de Gestión Logística de Equipaje**.
>
> **Nota:** Este archivo se debe mantener actualizado conforme cambien las tareas del frontend. Cualquier modificación debe reflejarse también en `TAREAS_EQUIPO.md`.

---

## Estado actual del frontend

| Área | Estado | Notas |
|---|---|---|
| Frontend — Login, Admin, Mapa | ~65% | Faltan: reporte, registro equipaje, conexión API real |

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 + TypeScript 5 |
| Estilos | Tailwind CSS 4 |
| Mapas | React-Leaflet + Leaflet |
| Autenticación | JWT (cookie `token`) |
| Build | `npm run dev` → `http://localhost:3000` |

---

## Convenciones del frontend

- Usar `@/` alias para imports
- Componentes reutilizables en `components/ui/`
- Clases utilitarias de Tailwind CSS
- Mock data en `lib/mock.ts` con patrón `.catch(() => MOCK_DATA)`
- App Router: `/login`, `/admin`, `/operacion`, `/simulacion`, `/simulacion/[id]`
- Middleware en `middleware.ts` para protección de rutas por rol

---

## Usuarios de prueba

| Correo | Password | Rol |
|---|---|---|
| admin@tasfb2b.com | admin123 | ADMINISTRADOR |
| operador@tasfb2b.com | operador123 | OPERADOR_LOGISTICO |
| analista@tasfb2b.com | analista123 | ANALISTA |

---

## Tareas específicas del frontend

### C1 — Página `/simulacion/[id]/reporte`

**Prioridad:** Alta | **Dependencias:** Ninguna (usa mock data inicialmente)

- [ ] Crear página de reporte con Recharts `LineChart` mostrando `serie_sla`
- [ ] Tarjetas resumen: SLA%, replanificadas, punto de colapso
- [ ] Usar patrón `.catch(() => MOCK_DATA)` para fallback a datos mock
- [ ] Conectar a API real cuando Backend B8 esté listo (`GET /sesiones/{id}/reporte`)

---

### C2 — Formulario registro equipaje

**Prioridad:** Alta | **Dependencias:** Ninguna (usa mock data inicialmente)

- [x] En ruta `/operacion`: formulario con campos:
  - `id_equipaje` (texto)
  - `destino_iata` (select con aeropuertos destino)
  - `vuelo_id` (select que carga desde `/vuelos?estado=PROGRAMADO`)
  - `sla_comprometido` (input numérico)
- [x] POST a `/api/equipajes` al enviar
- [x] Manejo de errores y feedback visual

---

### C3 — Middleware protección rutas

**Prioridad:** Alta | **Dependencias:** Ninguna

- [ ] En `middleware.ts`: leer cookie `token`
- [ ] Extraer rol del JWT
- [ ] Proteger rutas:
  - `/admin` → solo ADMINISTRADOR
  - `/simulacion` → solo ANALISTA (y `/simulacion/[id]`)
  - `/operacion` → solo OPERADOR_LOGISTICO
- [ ] Redirigir a `/login` si no hay token o rol incorrecto

---

### C4 — UI carga masiva

**Prioridad:** Media | **Dependencias:** Backend A2 (carga masiva CSV)

- [ ] Componente para upload de archivo CSV
- [ ] Preview de datos con columnas: `válidos`, `con_revisión`
- [ ] Botón de confirmar
- [ ] Conectar a `POST /api/equipajes/carga-masiva` y `POST /api/equipajes/carga-masiva/confirmar`

---

### C5 — Conectar simulación a API real

**Prioridad:** Alta | **Dependencias:** Backend B5 (SesionService + SesionController)

- [ ] Reemplazar `tickMetricasMock` por polling a `GET /api/sesiones/{id}/metricas`
- [ ] Botones Iniciar / Pausar / Detener conectados a sus endpoints:
  - `POST /api/sesiones/{id}/iniciar`
  - `POST /api/sesiones/{id}/pausar`
  - `POST /api/sesiones/{id}/detener`
- [ ] Modal "Simular" conectado a `POST /api/sesiones`

---

### C6 — Link a reporte

**Prioridad:** Media | **Dependencias:** C1 + Backend B8

- [ ] En `/simulacion/[id]`: botón "Ver Reporte" visible cuando estado = FINALIZADA
- [ ] Redirige a `/simulacion/[id]/reporte`

---

### C7 — Botón manifiesto PDF

**Prioridad:** Baja | **Dependencias:** Backend A4 (Manifiesto PDF)

- [ ] Botón de descarga en `/operacion`
- [ ] GET a `/api/manifiestos/{vuelo_id}`
- [ ] Descargar archivo PDF generado

---

## Tareas extra (de la lista general, aplican a frontend)

| # | Tarea | Prioridad | Estado | Notas |
|---|-------|-----------|--------|-------|
| 1 | Mejorar página de administración de usuarios (`/admin`) para que roles se vean mejor y esté más organizada visualmente | Media | Pendiente | |
| 2 | Hacer pruebas manuales en frontend (y backend) de toda la aplicación para detectar errores | Alta | Pendiente | Hacer un checklist de pruebas |
| 3 | Conectar el "Simular" (modal en `/simulacion`) de forma real con el backend | Alta | Pendiente | Endpoint `/api/sesiones` ya existe — duplicado de C5 |
| 4 | Darle estilos a la card/página de cada ruta del sidebar (admin, operacion, simulacion) | Media | Pendiente | Unificar diseño |
| 5 | Darle mejor diseño a la tabla de manifiestos | Baja | Pendiente | |

---

## Orden sugerido de trabajo

### Semana 1 (Foundation — sin dependencias del backend)

```
C3 (middleware) → C1 (reporte mock) → C2 (registro equipaje)
```

### Semana 2 (Conexión a APIs)

```
C5 (conectar simulación a API real) → C6 (link a reporte)
```

### Semana 3 (Integración y polish)

```
C4 (UI carga masiva) → C7 (botón PDF) → Tareas extra
```

---

## Specs de referencia

| Archivo | Contenido |
|---|---|
| `openspec/specs/frontend-structure.md` | Estructura de carpetas y componentes del frontend |
| `openspec/specs/api-contracts.md` | Contratos de endpoints — fuente de verdad para conexiones API |
| `openspec/specs/bc3-identidad-acceso.md` | Reglas de negocio de autenticación y roles |
| `openspec/specs/database-schema.md` | Esquema de base de datos (referencia) |

---

## Levantar ambiente local

```bash
# Frontend
cd frontend
npm run dev

# Backend (si se necesita probar integración)
cd backend/backend
cp .env.example .env  # editar con credenciales locales
./mvnw spring-boot:run
```

Frontend: http://localhost:3000
Backend API: http://localhost:8080/api

---

## Convenciones de commits

```bash
git checkout -b frontend/<feature-name>
git add .
git commit -m "feat(frontend): descripción de la funcionalidad"
```

| Prefijo | Cuándo |
|---|---|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de bug |
| `chore:` | Configuración, dependencias |
| `refactor:` | Reestructuración sin cambio de comportamiento |
