# BC3 Implementation Spec

## Status: IMPLEMENTED

## Implementation Notes

### Package Structure
```
com.tasfb2b.backend.bc3/
├── domain/
│   ├── Usuario.java
│   ├── Rol.java
│   ├── EntradaAuditoria.java
│   └── EstadoUsuario.java (enum)
├── application/
│   ├── AuthService.java
│   └── UsuarioService.java
└── infrastructure/
    ├── AuthController.java
    ├── UsuarioController.java
    ├── RolRepository.java
    ├── UsuarioRepository.java
    ├── EntradaAuditoriaRepository.java
    └── DataSeeder.java (tambien seeds BC1)
```

### Key Implementation Details

#### AuthService
- autenticar() valida credenciales con BCrypt
- Genera JWT con claims: id, correo, rol, nodo_ref_id
- Registra login en EntradaAuditoria
- Lanza CredencialesInvalidasException o UsuarioInactivoException

#### JwtUtil
- Genera tokens HS256 con clave de application.properties
- Metodos: generarToken(), esTokenValido(), extraerClaims(), extraerRol(), extraerUsuarioId(), extraerNodoRefId()

#### SecurityConfig
- CSRF disabled (stateless)
- Endpoints publicos: /health, /api/auth/**
- Roles por prefijo ROLE_ (Spring Security convention)

#### DataSeeder
- Ejecuta en ApplicationReadyEvent
- Solo hace seed si no hay roles existentes
- Seeds BC3 y BC1

### Users Seeded

| Correo | Password | Rol |
|--------|----------|-----|
| admin@tasfb2b.com | admin123 | ADMINISTRADOR |
| operador@tasfb2b.com | operador123 | OPERADOR_LOGISTICO |
| analista@tasfb2b.com | analista123 | ANALISTA |

### Migrations

- V1__roles.sql
- V2__usuarios.sql
- V3__entradas_auditoria.sql
- V4__seed_bc3.sql (vaciado, seed ahora en Java)