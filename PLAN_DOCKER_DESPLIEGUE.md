# Plan: Docker para Desarrollo + CI/CD con GitHub Actions

## Arquitectura

| Entorno | Backend | Frontend | BD | Cache |
|---|---|---|---|---|
| **Desarrollo** | Docker (JDK 21) | Docker (Node 22, hot-reload) | Docker (PostgreSQL 16) | Docker (Redis 7) |
| **CI/CD** | GitHub Actions (mvn verify) | GitHub Actions (npm build) | — | — |
| **Producción** | WAR → Tomcat 10 externo (`/var/lib/tomcat10/webapps/ROOT.war`) | Next.js standalone (`:3000`) con systemd | PostgreSQL 16 nativo | Redis 7 nativo |

Dominio configurado con Tomcat 10, Nginx como reverse proxy.

---

## 1. Modificaciones al Backend (WAR para Tomcat 10)

### `backend/backend/pom.xml`

- Cambiar `<packaging>jar</packaging>` → `<packaging>war</packaging>`
- Marcar `spring-boot-starter-tomcat` como `<scope>provided</scope>`
- Agregar dependencia `spring-boot-starter-web`

### `BackendApplication.java`

```java
package com.tasfb2b.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.boot.builder.SpringApplicationBuilder;

@SpringBootApplication
public class BackendApplication extends SpringBootServletInitializer {

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {
        return builder.sources(BackendApplication.class);
    }

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }
}
```

---

## 2. Docker Compose — Desarrollo Local

### `docker-compose.yml` (raíz del repo)

```yaml
services:
  db:
    image: postgres:16
    container_name: tasfb2b-db
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: tasfb2b_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: tasfb2b-redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend/backend
      dockerfile: Dockerfile
    container_name: tasfb2b-backend
    ports:
      - "8080:8080"
    environment:
      SERVER_PORT: 8080
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: tasfb2b_db
      DB_USER: postgres
      DB_PASSWORD: postgres
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: dev_jwt_secret_key_at_least_32_chars_long
      SHOW_SQL: "true"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: tasfb2b-frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8080
    depends_on:
      - backend

volumes:
  pgdata:
```

### `backend/Dockerfile`

```dockerfile
# ---- Build Stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

# ---- Runtime Stage ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.war app.war
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.war"]
```

### `frontend/Dockerfile.dev`

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

---

## 3. Pipeline CI/CD — GitHub Actions

### `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  BACKEND_DIR: backend/backend
  FRONTEND_DIR: frontend

jobs:
  backend-ci:
    name: Backend - Build & Test
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ${{ env.BACKEND_DIR }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: "21"
          distribution: "temurin"
          cache: "maven"

      - name: Build and test
        run: mvn clean verify

  frontend-ci:
    name: Frontend - Build & Lint
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ${{ env.FRONTEND_DIR }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: ${{ env.FRONTEND_DIR }}/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Lint
        run: npm run lint

  deploy:
    name: Deploy to AWS
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: [backend-ci, frontend-ci]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            set -e

            # Ir al repo
            cd "${{ secrets.SERVER_DIR }}"

            # Actualizar codigo
            git pull origin main

            # ── Backend ──────────────────────────
            cd backend/backend
            mvn clean package -DskipTests
            sudo cp target/*.war /var/lib/tomcat10/webapps/ROOT.war
            echo "✅ Backend WAR deployed. Tomcat auto-deploys."

            # ── Frontend ─────────────────────────
            cd ../../frontend
            npm ci
            npm run build
            sudo systemctl restart tasfb2b-frontend
            echo "✅ Frontend restarted."
```

### Secrets requeridos en GitHub Actions

| Secret | Descripción |
|---|---|
| `SSH_HOST` | IP pública del servidor AWS Academy |
| `SSH_USER` | `ubuntu` |
| `SSH_PRIVATE_KEY` | Clave privada SSH (formato PEM) |
| `SERVER_DIR` | Ruta absoluta del repo en el servidor (ej: `/home/ubuntu/proyecto`) |

---

## 4. Setup Inicial del Servidor (una sola vez)

### 4.1 Instalar dependencias

```bash
# JDK 21
sudo apt update
sudo apt install -y openjdk-21-jdk

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs

# Verificar
java -version
node -v
npm -v
```

### 4.2 Clonar repo y configurar entorno

```bash
cd /home/ubuntu
git clone <repo-url> proyecto
cd proyecto/backend/backend

# Crear .env con secrets reales
cat > .env << EOF
SERVER_PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tasfb2b_db
DB_USER=postgres
DB_PASSWORD=<password-segura>
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=<clave-secreta-segura>
SHOW_SQL=false
EOF
```

### 4.3 Systemd — Frontend (`/etc/systemd/system/tasfb2b-frontend.service`)

```ini
[Unit]
Description=TAS FB2B - Next.js Frontend (Standalone)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/proyecto/frontend
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable tasfb2b-frontend
sudo systemctl start tasfb2b-frontend
```

### 4.4 Nginx — Reverse Proxy

Crear `/etc/nginx/sites-available/tasfb2b`:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    # Frontend — Next.js standalone
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend — API REST via Tomcat
    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check publico
    location /health {
        proxy_pass http://localhost:8080/health;
        proxy_set_header Host $host;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tasfb2b /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 5. Resumen de Archivos

| Archivo | Acción |
|---|---|
| `backend/backend/pom.xml` | **Modificar** — packaging war, tomcat provided |
| `backend/backend/src/main/java/.../BackendApplication.java` | **Modificar** — extender SpringBootServletInitializer |
| `docker-compose.yml` | **Crear** |
| `backend/Dockerfile` | **Crear** |
| `frontend/Dockerfile.dev` | **Crear** |
| `.github/workflows/ci-cd.yml` | **Crear** |
| `.gitignore` | **Verificar** — agregar `pgdata/` si no está |

---

## 6. Flujo de Trabajo

```
Desarrollador
    │
    ├── docker compose up    ← entorno local identico a produccion
    │
    ├── git push a main
    │       │
    │       ▼
    │   GitHub Actions
    │       │
    │       ├── backend-ci: mvn clean verify
    │       ├── frontend-ci: npm ci → build → lint
    │       │
    │       └── deploy (si es main)
    │               │
    │               ▼
    │           Servidor AWS (Ubuntu 24.04)
    │               ├── git pull
    │               ├── mvn package → WAR → /var/lib/tomcat10/webapps/ROOT.war
    │               ├── npm ci → npm build → systemctl restart frontend
    │               └── ✅ Desplegado
    │
    └── Nginx expone:
            ├── / → Next.js (:3000)
            └── /api/* → Tomcat (:8080)
```
