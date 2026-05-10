# TAS FB2B — Sistema de Gestión Logística de Equipaje

Sistema académico para el enrutamiento óptimo de equipaje entre aeropuertos, con simulación de escenarios logísticos y monitoreo en tiempo real.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 + TypeScript + Tailwind CSS |
| Backend | Spring Boot 3 + Java 21 |
| Base de datos | PostgreSQL 16 |
| Caché | Redis 7 |
| Autenticación | JWT (jjwt 0.12.x) |

---

## Estructura del repositorio

```
/
├── backend/          → Proyecto Spring Boot (Maven)
├── frontend/         → Proyecto Next.js
├── openspec/
│   └── specs/        → Fuente de verdad compartida
│       ├── database-schema.md
│       ├── api-contracts.md
│       ├── bc1-gestion-operativa.md
│       ├── bc2-planificacion-replanificacion.md
│       ├── bc3-identidad-acceso.md
│       └── frontend-structure.md
└── README.md
```

---

## Prerrequisitos

| Herramienta | Versión mínima |
|---|---|
| Java | 21 |
| Node.js | 20 LTS |
| PostgreSQL | 16 |
| Redis | 7 |
| Maven | 3.9+ |

---

## Levantar el backend

### 1. Crear la base de datos

```bash
psql -U postgres -c "CREATE DATABASE tasfb2b_db;"
```

### 2. Configurar variables de entorno

Copiar el archivo de ejemplo y completarlo:

```bash
cp backend/.env.example backend/.env
```

Editar `backend/.env` con tus credenciales locales:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tasfb2b_db
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=una_clave_secreta_de_al_menos_32_caracteres
```

### 3. Verificar `application.properties`

El archivo ya está configurado para leer las variables de entorno. Si prefieren hardcodear los valores para desarrollo local, editar directamente `backend/src/main/resources/application.properties`.

### 4. Levantar

```bash
cd backend
./mvnw spring-boot:run
```

Verificar que funciona:

```bash
curl http://localhost:8080/health
# → { "status": "ok" }
```

> Al arrancar, Hibernate crea las tablas automáticamente (`ddl-auto=create`) y se ejecuta el seed de roles, usuarios y plan de vuelos.

---

## Levantar el frontend

### 1. Instalar dependencias

```bash
cd frontend
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Contenido de `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

### 3. Levantar

```bash
npm run dev
```

Abrir en el navegador: [http://localhost:3000](http://localhost:3000)

---

## Usuarios de prueba (seed inicial)

| Correo | Contraseña | Rol |
|---|---|---|
| admin@tasfb2b.com | admin123 | Administrador |
| operador@tasfb2b.com | operador123 | Operador Logístico |
| analista@tasfb2b.com | analista123 | Analista |

---

## Flujo de trabajo (GitHub Flow)

```bash
# Siempre partir de main actualizado
git checkout main && git pull

# Crear rama para tu tarea
git checkout -b backend/motor-greedy

# Trabajar, commitear
git add .
git commit -m "feat: implementar motor greedy con escala única"

# Push y abrir Pull Request hacia main
git push origin backend/motor-greedy
```

### Convención de commits

| Prefijo | Cuándo usarlo |
|---|---|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de bug |
| `chore:` | Configuración, dependencias |

### Reglas

- **Nunca pushear directamente a `main`.**
- Siempre abrir un Pull Request.
- PM/Lead revisa y mergea.
- Si es urgente, cualquier otro miembro puede aprobar.

---

## Specs de referencia

Antes de implementar cualquier cosa, leer el spec correspondiente en `openspec/specs/`:

| Archivo | Para quién |
|---|---|
| `database-schema.md` | P2 y P4 — tablas SQL exactas |
| `api-contracts.md` | P2 y P4 (implementan) · P3 (consume) |
| `bc1-gestion-operativa.md` | P2 |
| `bc2-planificacion-replanificacion.md` | P4 |
| `bc3-identidad-acceso.md` | PM/Lead |
| `frontend-structure.md` | P3 |

**La regla:** si hay duda sobre qué devuelve un endpoint o qué campo va en qué tabla, la respuesta está en los specs. Si falta algo, avisar al PM/Lead para actualizar el spec antes de improvisar.
