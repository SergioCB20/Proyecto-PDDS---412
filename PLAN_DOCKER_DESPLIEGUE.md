# Plan: Docker para Desarrollo + CI/CD con GitHub Actions

## Arquitectura

| Entorno | Backend | Frontend | BD | Cache |
|---|---|---|---|---|
| **Desarrollo** | Docker (Tomcat 10 + WAR) | Docker (Node 22, hot-reload `:5000`) | Docker (PostgreSQL 16) | Docker (Redis 7) |
| **CI/CD** | GitHub Actions (mvn verify) | GitHub Actions (npm build) | — | — |
| **Producción** | WAR → Tomcat 10 externo (`/var/lib/tomcat10/webapps/ROOT.war`) | Next.js standalone (`:5000`) con systemd | PostgreSQL 16 nativo | Redis 7 nativo |

Nginx como reverse proxy (único punto de entrada pública): `/front` → Next.js (`:5000`), `/back` → Tomcat (`:8080`).

> **Firewall PUCP:** Solo los puertos **22** (SSH), **80** (HTTP) y **443** (HTTPS) son accesibles desde el exterior. Todos los servicios internos (Next.js, Tomcat, PostgreSQL, Redis) deben escuchar únicamente en `localhost` y Nginx es el único punto de entrada pública. Se debe instalar Certbot para habilitar HTTPS en el puerto 443 con redirección automática desde el puerto 80.

---

## 1. Modificaciones al Backend (WAR para Tomcat 10)

### `backend/backend/pom.xml`

- Cambiar `<packaging>jar</packaging>` → `<packaging>war</packaging>`
- Marcar `spring-boot-starter-tomcat` como `<scope>provided</scope>`

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
      - "5000:5000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8080
      PORT: "5000"
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

# ---- Runtime Stage (Tomcat 10) ----
FROM tomcat:10.1-jdk21-temurin
WORKDIR /usr/local/tomcat
RUN rm -rf webapps/*
COPY --from=build /app/target/*.war webapps/ROOT.war
EXPOSE 8080
CMD ["catalina.sh", "run"]
```

### `frontend/Dockerfile.dev`

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 5000
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
    name: Deploy to Server PUCP
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
| `SSH_HOST` | IP pública del servidor PUCP |
| `SSH_USER` | `ubuntu` |
| `SSH_PRIVATE_KEY` | Clave privada SSH (formato PEM) |
| `SERVER_DIR` | Ruta absoluta del repo en el servidor (ej: `/home/ubuntu/proyecto`) |

---

## 4. Setup Inicial del Servidor (una sola vez)

### 4.1 Instalar dependencias adicionales

```bash
# PostgreSQL 16 (si no está instalado)
sudo apt update
sudo apt install -y postgresql-16

# Redis 7
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt update
sudo apt install -y redis

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs

# Verificar
java -version
node -v
npm -v
redis-cli --version
psql --version
```

### 4.2 Clonar repo y configurar entorno

```bash
cd /home/ubuntu
git clone <repo-url> proyecto
cd proyecto/backend/backend

# Crear .env con secrets reales
cat > .env << EOF
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
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable tasfb2b-frontend
sudo systemctl start tasfb2b-frontend
```

### 4.4 PostgreSQL — Crear base de datos

```bash
sudo -u postgres psql -c "CREATE DATABASE tasfb2b_db;"
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD '<password-segura>';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE tasfb2b_db TO postgres;"
```

### 4.5 Nginx — Reverse Proxy con HTTPS

Nginx es el único punto de entrada pública. Sirve en el puerto 443 con HTTPS y redirige automáticamente el puerto 80 al 443.

> **Importante:** Antes de crear la configuración, asegúrate de que el dominio `tu-dominio.com` (o la IP pública del servidor) apunte correctamente al servidor y que el puerto 80 esté accesible temporalmente para que Certbot pueda validar el dominio.

Crear `/etc/nginx/sites-available/tasfb2b`:

```nginx
# Redirección HTTP → HTTPS (puerto 80 → 443)
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        return 301 https://$host$request_uri;
    }

    # Certbot necesita el puerto 80 para la validación ACME
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}

# Servidor HTTPS (puerto 443)
server {
    listen 443 ssl;
    server_name tu-dominio.com;

    # Certificados SSL (generados por Certbot)
    ssl_certificate     /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Frontend — Next.js standalone en :5000
    location / {
        return 302 /front/;
    }

    location = /front {
        return 302 /front/;
    }

    location /front/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend — API REST via Tomcat en :8080 (con WebSockets)
    location = /back {
        return 302 /back/;
    }

    location /back/ {
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
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
# Habilitar el sitio
sudo ln -s /etc/nginx/sites-available/tasfb2b /etc/nginx/sites-enabled/

# (Opcional) Deshabilitar el default site si existe
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuracion
sudo nginx -t
sudo systemctl restart nginx
```

### 4.6 Certbot — Certificado SSL

Ejecutar una sola vez para generar el certificado y actualizar la configuración de Nginx automáticamente:

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Generar certificado para el dominio
# Certbot modificara la configuracion de Nginx para agregar SSL
sudo certbot --nginx -d tu-dominio.com --non-interactive --agree-tos -m admin@tu-dominio.com

# Verificar renovacion automatica (Certbot crea un timer systemd por defecto)
sudo certbot renew --dry-run
```

> Certbot crea automáticamente un timer systemd (`certbot.timer`) que verifica la renovación dos veces al día. No es necesario configurar un cron job manualmente.

---

## 5. Resumen de Archivos

| Archivo | Acción |
|---|---|
| `backend/backend/pom.xml` | **Modificar** — packaging war, tomcat provided |
| `backend/backend/src/main/java/.../BackendApplication.java` | **Modificar** — extender SpringBootServletInitializer |
| `docker-compose.yml` | **Crear** / actualizar |
| `backend/Dockerfile` | **Crear** — multi-stage con Tomcat 10 |
| `frontend/Dockerfile.dev` | **Crear** — Node 22, puerto 5000 |
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
    │           Servidor PUCP (Ubuntu 24.04)
    │               ├── git pull
    │               ├── mvn package → WAR → /var/lib/tomcat10/webapps/ROOT.war
    │               ├── npm ci → npm build → systemctl restart frontend
    │               └── ✅ Desplegado
    │
    └── Nginx expone (puertos 80→443, único acceso público):
            ├── 80  → 301 redirect a HTTPS
            ├── 443 → HTTPS
            │        ├── /front/* → Next.js (:5000)
            │        ├── /back/*  → Tomcat (:8080) con WebSockets
            │        └── /health  → Tomcat (:8080/health)
            └── Certbot para SSL (letsencrypt)
```
