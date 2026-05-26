# Plan: Docker para Desarrollo + CI/CD con GitHub Actions

## Arquitectura

| Entorno | Backend | Frontend | BD | Cache |
|---|---|---|---|---|
| **Desarrollo** | Docker (Tomcat 10 + WAR) | Docker (Node 22, hot-reload `:5000`) | Docker (PostgreSQL 16) | Docker (Redis 7) |
| **CI/CD** | GitHub Actions (mvn verify) | GitHub Actions (npm build) | — | — |
| **Producción** | WAR → Tomcat 11 externo (`/opt/tomcat11/webapps/ROOT.war`) | Next.js standalone (`:5000`) con systemd `frontend.service` | PostgreSQL 16 nativo | Redis 7 nativo |

Nginx como reverse proxy (único punto de entrada pública): `/front` → Next.js (`:5000`), `/back` → Tomcat 11 (`:8080`).

> **Firewall PUCP:** Solo los puertos **22** (SSH), **80** (HTTP) y **443** (HTTPS) son accesibles desde el exterior. Todos los servicios internos (Next.js, Tomcat, PostgreSQL, Redis) deben escuchar únicamente en `localhost` y Nginx es el único punto de entrada pública. Se debe instalar Certbot para habilitar HTTPS en el puerto 443 con redirección automática desde el puerto 80.

---

## 1. Modificaciones al Backend (WAR para Tomcat 11)

### `backend/backend/pom.xml`

- Cambiar `<packaging>jar</packaging>` → `<packaging>war</packaging>`
- Marcar `spring-boot-starter-tomcat` como `<scope>provided</scope>`
- Usar `spring-boot-starter-web` (no `webmvc`, que no existe como artifactID estándar)
- Deshabilitar el `repackage` goal del `spring-boot-maven-plugin` (evita que mueva JARs a `WEB-INF/lib-provided/`, directorio ignorado por Tomcat externo):
  ```xml
  <executions>
      <execution>
          <id>repackage</id>
          <phase>none</phase>
      </execution>
  </executions>
  ```

> **Importante:** Spring Boot 4.0.6 requiere **Tomcat 11** (Servlet 6.1). No funciona en Tomcat 10.1 (Servlet 6.0).

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

### `frontend/next.config.ts`

- Agregar `basePath: "/front"` para que Next.js sirva assets estáticos y maneje rutas correctamente cuando está detrás de Nginx con prefijo `/front/`:
  ```typescript
  const nextConfig: NextConfig = {
    basePath: "/front",
  };
  ```

### `frontend/proxy.ts`

- Sanitizar el `pathname` quitando `BASE_PATH` antes de comparar rutas protegidas:
  ```typescript
  const BASE_PATH = "/front";
  function stripBase(path: string) {
    return path.startsWith(BASE_PATH) ? path.slice(BASE_PATH.length) || "/" : path;
  }
  ```
- Todos los redirects deben incluir `${BASE_PATH}` (ej: `new URL(\`${BASE_PATH}/login\`, request.url)`).

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
| `SSH_HOST` | IP pública del servidor PUCP (`1inf54-983-4d.inf.pucp.edu.pe`) |
| `SSH_USER` | `1inf54.983.4d` |
| `SSH_PRIVATE_KEY` | Clave privada SSH (formato PEM, generada en el servidor con `ssh-keygen -t ed25519`) |
| `SERVER_DIR` | Ruta absoluta del repo en el servidor (`/home/1inf54.983.4d/proyecto`) |

---

## 4. Setup Inicial del Servidor (una sola vez)

> **Nota:** El servidor PUCP usa Ubuntu 24.04 LTS con el usuario `1inf54.983.4d`. Las rutas y nombres de usuario en los ejemplos deben ajustarse según el entorno.

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
cd /home/1inf54.983.4d
git clone <repo-url> proyecto
cd proyecto/backend/backend

# Crear setenv.sh para Tomcat (variables de entorno)
sudo tee /opt/tomcat11/bin/setenv.sh << 'EOF'
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=tasfb2b_db
export DB_USER=postgres
export DB_PASSWORD=pass123
export REDIS_HOST=localhost
export REDIS_PORT=6379
export JWT_SECRET=pass123_seguro_cambiar_en_produccion_32_chars
export SHOW_SQL=false
EOF
sudo chmod +x /opt/tomcat11/bin/setenv.sh
```

> **Alternativa:** Las variables también pueden inyectarse directamente en el systemd service de Tomcat mediante directivas `Environment=`.

### 4.3 Tomcat 11 — Instalación manual (no disponible en apt)

Spring Boot 4.0.6 requiere Tomcat 11 (Servlet 6.1). Como no existe paquete oficial en Ubuntu, se instala manualmente:

```bash
cd /opt
sudo wget https://dlcdn.apache.org/tomcat/tomcat-11/v11.0.22/bin/apache-tomcat-11.0.22.tar.gz
sudo tar -xzf apache-tomcat-11.0.22.tar.gz
sudo mv apache-tomcat-11.0.22 tomcat11
sudo useradd -r -s /bin/false tomcat
sudo chown -R tomcat:tomcat /opt/tomcat11
sudo find /opt/tomcat11/bin -name "*.sh" -exec chmod +x {} \;
```

Crear systemd service (`/etc/systemd/system/tomcat11.service`):

```ini
[Unit]
Description=Apache Tomcat 11
After=network.target postgresql.service

[Service]
Type=forking
User=tomcat
Group=tomcat
Environment="JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64"
Environment="CATALINA_HOME=/opt/tomcat11"
Environment="CATALINA_BASE=/opt/tomcat11"
Environment="CATALINA_PID=/opt/tomcat11/temp/tomcat.pid"
Environment="DB_HOST=localhost"
Environment="DB_PORT=5432"
Environment="DB_NAME=tasfb2b_db"
Environment="DB_USER=postgres"
Environment="DB_PASSWORD=pass123"
Environment="REDIS_HOST=localhost"
Environment="REDIS_PORT=6379"
Environment="JWT_SECRET=pass123_seguro_cambiar_en_produccion_32_chars"
Environment="SHOW_SQL=false"
ExecStart=/opt/tomcat11/bin/startup.sh
ExecStop=/opt/tomcat11/bin/shutdown.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable tomcat11
sudo systemctl start tomcat11
```

### 4.4 Systemd — Frontend (`/etc/systemd/system/frontend.service`)

```ini
[Unit]
Description=TasFB2B Frontend Next.js
After=network.target

[Service]
Type=simple
User=1inf54.983.4d
WorkingDirectory=/home/1inf54.983.4d/proyecto/frontend
Environment="NEXT_PUBLIC_API_URL=/back/api"
ExecStart=/usr/bin/npm start -- -p 5000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now frontend
```

### 4.5 PostgreSQL — Crear base de datos

```bash
sudo -u postgres psql -c "CREATE DATABASE tasfb2b_db;"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'pass123';"
```

### 4.6 Configurar Sudoers para CI/CD

Para que GitHub Actions pueda ejecutar comandos privilegiados sin contraseña:

```bash
echo '1inf54.983.4d ALL=(ALL) NOPASSWD: /bin/cp, /bin/systemctl, /usr/bin/systemctl, /usr/sbin/nginx' | sudo tee /etc/sudoers.d/tasfb2b
```

### 4.7 Generar SSH Key para GitHub Actions

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github-actions -N ""
cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github-actions
# Copiar la clave privada al secret SSH_PRIVATE_KEY del repositorio en GitHub
```

### 4.8 Nginx — Reverse Proxy con HTTPS

Nginx es el único punto de entrada pública. Sirve en el puerto 443 con HTTPS y redirige automáticamente el puerto 80 al 443.

> **Importante:** Antes de crear la configuración, asegúrate de que el dominio `tu-dominio.com` (o la IP pública del servidor) apunte correctamente al servidor y que el puerto 80 esté accesible temporalmente para que Certbot pueda validar el dominio.

Crear `/etc/nginx/sites-available/tasfb2b` (configuración real del servidor PUCP):

```nginx
server {
    server_name 1inf54-983-4d.inf.pucp.edu.pe;

    # Redirect raíz a /front/
    location / {
        return 302 /front/;
    }
    location = /front {
        return 302 /front/;
    }

    # Frontend — Next.js (con basePath: "/front")
    location /front/ {
        proxy_pass http://localhost:5000;       # ← SIN trailing slash
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend — API REST via Tomcat 11 en :8080
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

    # Health check público
    location /health {
        proxy_pass http://localhost:8080/health;
        proxy_set_header Host $host;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/1inf54-983-4d.inf.pucp.edu.pe/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/1inf54-983-4d.inf.pucp.edu.pe/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
server {
    if ($host = 1inf54-983-4d.inf.pucp.edu.pe) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name 1inf54-983-4d.inf.pucp.edu.pe;
    return 404; # managed by Certbot
}
```

> **Nota clave:** `proxy_pass http://localhost:5000;` **sin** `/` al final. Con `basePath: /front` en Next.js, Nginx debe pasar la URL completa (`/front/...`) al servidor Next.js. Si se agrega un trailing slash en `proxy_pass`, Nginx elimina el prefijo `/front/` y las rutas fallan. Lo mismo aplica a la entrega de assets estáticos (`/_next/static/...`).

```bash
# Habilitar el sitio
sudo ln -s /etc/nginx/sites-available/tasfb2b /etc/nginx/sites-enabled/

# (Opcional) Deshabilitar el default site si existe
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuracion
sudo nginx -t
sudo systemctl restart nginx
```

### 4.9 Certbot — Certificado SSL

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

### 4.10 Verificar despliegue completo

```bash
# 1. Backend health
curl http://localhost:8080/health
# → {"status":"ok"}

# 2. Frontend via Nginx
curl -L https://1inf54-983-4d.inf.pucp.edu.pe/ | head -20
# → HTML del login con estilos CSS

# 3. API via Nginx
curl https://1inf54-983-4d.inf.pucp.edu.pe/back/health
# → {"status":"ok"}

# 4. Iniciar sesión
curl -s -X POST https://1inf54-983-4d.inf.pucp.edu.pe/back/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tasfb2b.com","password":"admin123"}'
# → Token JWT
```

---

## 5. Resumen de Archivos

| Archivo | Acción |
|---|---|
| `backend/backend/pom.xml` | **Modificar** — packaging war, tomcat provided, spring-boot-web, disable repackage |
| `backend/backend/src/main/java/.../BackendApplication.java` | **Modificar** — extender SpringBootServletInitializer |
| `frontend/next.config.ts` | **Modificar** — agregar `basePath: "/front"` |
| `frontend/proxy.ts` | **Modificar** — sanitizar pathname con `stripBase` |
| `docker-compose.yml` | **Crear** / actualizar |
| `backend/Dockerfile` | **Crear** — multi-stage con Tomcat 10 (desarrollo) |
| `frontend/Dockerfile.dev` | **Crear** — Node 22, puerto 5000 |
| `.github/workflows/ci-cd.yml` | **Crear** — CI + deploy automático a servidor PUCP |
| `PLAN_DOCKER_DESPLIEGUE.md` | **Actualizar** — documentar cambios reales |
| Servidor: `/etc/nginx/sites-available/tasfb2b` | **Crear** — Nginx con HTTPS + proxy /front/ y /back/ |
| Servidor: `/etc/systemd/system/tomcat11.service` | **Crear** — systemd para Tomcat 11 |
| Servidor: `/etc/systemd/system/frontend.service` | **Crear** — systemd para Next.js |
| Servidor: `/opt/tomcat11/bin/setenv.sh` | **Crear** — variables de entorno para Tomcat |
| Servidor: `/etc/sudoers.d/tasfb2b` | **Crear** — sudoers para CI/CD |

---

## 6. Flujo de Trabajo

```
Desarrollador
    │
    ├── docker compose up    ← entorno local idéntico a producción
    │
    ├── git push a main
    │       │
    │       ▼
    │   GitHub Actions
    │       │
    │       ├── backend-ci: mvn clean verify  (con PostgreSQL + Redis services)
    │       ├── frontend-ci: npm ci → build → lint
    │       │
    │       └── deploy (si es main y push)
    │               │
    │               ▼
    │           Servidor PUCP (Ubuntu 24.04, 4 GB RAM)
    │               ├── git pull origin main
    │               ├── mvn package → WAR → /opt/tomcat11/webapps/ROOT.war
    │               ├── sudo rm -rf /opt/tomcat11/webapps/ROOT
    │               ├── npm ci → npm build → systemctl restart frontend
    │               ├── sudo systemctl reload nginx
    │               ├── sleep 20 → health check
    │               └── ✅ Desplegado
    │
    ├── Requisitos en servidor:
    │       ├── GitHub Secrets: SSH_HOST, SSH_USER, SSH_PRIVATE_KEY, SERVER_DIR
    │       ├── SSH key generada + authorized_keys
    │       ├── Sudoers NOPASSWD: cp, systemctl, nginx
    │       ├── Tomcat 11 en /opt/tomcat11 (systemd)
    │       └── Frontend service (systemd, puerto 5000)
    │
    └── Nginx expone (puertos 80→443, único acceso público):
            ├── 80  → 301 redirect a HTTPS (Certbot)
            ├── 443 → HTTPS
            │        ├── /           → 302 /front/
            │        ├── /front/*    → Next.js (:5000) — login, admin, operacion, simulacion
            │        ├── /back/*     → Tomcat 11 (:8080) — API REST + WebSockets
            │        └── /health     → Tomcat 11 (:8080/health)
            └── Certbot para SSL (letsencrypt)
```
