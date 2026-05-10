# BC3 — Identidad y Acceso

> **Spec owner:** PM/Lead  
> **Estado:** Draft v1  
> **Última actualización:** 10/05/2026
> **Implementado por:** PM/Lead

---

## Propósito

El contexto más acotado e independiente. Gestiona quién puede entrar al sistema y qué puede hacer, a través de `Usuario`, `Rol` y el `ServicioAutenticacion`. Es el guardián del sistema: ningún otro módulo es alcanzable sin pasar primero por este contexto.

---

## Aggregate Roots

| Aggregate Root | Descripción |
|---|---|
| `Usuario` | Cuenta de acceso con rol y asignación a un nodo logístico. |
| `Rol` | Define el nivel de acceso (ADMINISTRADOR, OPERADOR_LOGISTICO, ANALISTA). |
| `EntradaAuditoria` | Registro inmutable de acciones relevantes en el sistema. |

---

## Value Objects (embebidos en Usuario)

| Value Object | Descripción |
|---|---|
| `CredencialesAuth` | Hash de contraseña, último acceso e intentos fallidos. No tiene identidad propia. |
| `AsignacionNodo` | Referencia lógica al nodo logístico asignado y fecha de asignación. |

---

## Domain Service

### `ServicioAutenticacion`

```java
// Valida credenciales y devuelve JWT
String autenticar(String correo, String password);

// Revoca el acceso cambiando estado a INACTIVO
void revocarAcceso(UUID usuarioId);

// Valida que el usuario tiene el rol requerido para el endpoint
boolean validarRol(String token, String rolRequerido);
```

---

## Reglas de negocio

### Usuarios
- El correo corporativo es único en el sistema.
- No se puede cambiar el `rol` ni el `nodo_ref_id` de un usuario existente (solo el Administrador puede hacerlo al crear).
- Los usuarios no se eliminan físicamente — solo se inactivan (estado `INACTIVO`).
- Un usuario `INACTIVO` no puede autenticarse.
- Máximo 5 intentos fallidos de login antes de bloquear temporalmente (opcional para esta entrega).

### Autenticación JWT
- El token JWT contiene: `id`, `correo`, `rol`, `nodo_ref_id`.
- Expiración configurada en `jwt.expiration` (por defecto 86400000 ms = 24h).
- Cada request protegido debe incluir `Authorization: Bearer {token}`.
- Si el token está expirado o es inválido → `401 Unauthorized`.
- Si el rol no tiene permiso para el endpoint → `403 Forbidden`.

### Auditoría
- `EntradaAuditoria` se registra para: login, creación de usuario, inactivación, generación de manifiesto.
- La tabla `entradas_auditoria` es **inmutable** — no se permite UPDATE ni DELETE.

---

## Matriz de control de acceso (RBAC)

| Módulo / Acción | ADMINISTRADOR | OPERADOR_LOGISTICO | ANALISTA |
|---|---|---|---|
| Login | ✓ | ✓ | ✓ |
| Crear usuario | ✓ | — | — |
| Listar usuarios | ✓ | — | — |
| Modificar usuario | ✓ | — | — |
| Inactivar usuario | ✓ | — | — |
| Registrar equipaje | — | ✓ | — |
| Carga masiva CSV | — | ✓ | — |
| Consultar vuelos | ✓ | ✓ | ✓ |
| Consultar nodos | ✓ | ✓ | ✓ |
| Cancelar vuelo (Postman) | — | ✓ | — |
| Generar manifiesto PDF | — | ✓ | — |
| Crear sesión simulación | — | — | ✓ |
| Controlar simulación | — | — | ✓ |
| Ver métricas sesión | — | — | ✓ |
| Ver reporte sesión | — | — | ✓ |

---

## Seed inicial

Al arrancar la aplicación se deben insertar automáticamente:

**Roles:**
```sql
INSERT INTO roles (id, nombre, permisos) VALUES
  (gen_random_uuid(), 'ADMINISTRADOR', '["USUARIOS_WRITE","USUARIOS_READ","VUELOS_READ","NODOS_READ"]'),
  (gen_random_uuid(), 'OPERADOR_LOGISTICO', '["EQUIPAJES_WRITE","VUELOS_READ","NODOS_READ","MANIFIESTOS_READ","CANCELACION_WRITE"]'),
  (gen_random_uuid(), 'ANALISTA', '["SESIONES_WRITE","SESIONES_READ","VUELOS_READ","NODOS_READ"]');
```

**Usuarios iniciales (contraseña: `admin123`, `operador123`, `analista123`):**

| nombre | correo | rol |
|---|---|---|
| Admin Sistema | admin@tasfb2b.com | ADMINISTRADOR |
| Operador Lima | operador@tasfb2b.com | OPERADOR_LOGISTICO |
| Analista Sim | analista@tasfb2b.com | ANALISTA |

> Las contraseñas deben almacenarse hasheadas con BCrypt. Nunca en texto plano.

---

## Configuración de Spring Security

```java
// Endpoints públicos (sin JWT):
.requestMatchers("/api/auth/**", "/health").permitAll()

// Endpoints protegidos por rol:
.requestMatchers("/api/usuarios/**").hasRole("ADMINISTRADOR")
.requestMatchers("/api/equipajes/**").hasRole("OPERADOR_LOGISTICO")
.requestMatchers("/api/sesiones/**").hasRole("ANALISTA")

// Todos los demás requieren autenticación:
.anyRequest().authenticated()
```

---

## Paquete Java

```
com.tasfb2b.backend.bc3/
├── domain/
│   ├── Usuario.java
│   └── Rol.java
├── application/
│   ├── AuthService.java          ← autenticar(), generarToken(), validarToken()
│   └── UsuarioService.java       ← crear, modificar, inactivar usuario
└── infrastructure/
    ├── UsuarioRepository.java
    ├── RolRepository.java
    ├── EntradaAuditoriaRepository.java
    ├── AuthController.java        ← POST /auth/login
    └── UsuarioController.java     ← GET/POST/PUT/PATCH /usuarios
```

---

## Clases compartidas (shared)

```
com.tasfb2b.backend.shared/
├── security/
│   ├── JwtUtil.java              ← generarToken(), validarToken(), extraerClaims()
│   ├── JwtFilter.java            ← intercepta cada request y valida el token
│   └── SecurityConfig.java       ← configuración de Spring Security
└── events/
    ├── EquipajeIngresadoEvent.java
    └── VueloCanceladoEvent.java
```

### JwtUtil — métodos clave

```java
String generarToken(Usuario usuario);
Claims extraerClaims(String token);
boolean esTokenValido(String token);
String extraerRol(String token);
UUID extraerUsuarioId(String token);
```
