## ADDED Requirements

### Requirement: Protección de rutas por rol

El middleware DEBERÁ proteger las rutas verificando el token JWT en cookies Y validando que el rol del usuario corresponde a la ruta accedida. Las rutas protegidas y sus roles asociados son:
- `/admin` → solo ADMINISTRADOR
- `/simulacion` y `/simulacion/[id]` → solo ANALISTA
- `/operacion` → solo OPERADOR_LOGISTICO

#### Scenario: Usuario autenticado con rol correcto accede a su ruta
- **WHEN** un usuario con token válido accede a `/operacion` con rol OPERADOR_LOGISTICO
- **THEN** el sistema permite el acceso y continúa a la página solicitada

#### Scenario: Usuario autenticado con rol incorrecto intenta acceder
- **WHEN** un usuario con rol ADMINISTRADOR intenta acceder a `/operacion`
- **THEN** el sistema redirige al usuario a `/admin` (su ruta permitida)

#### Scenario: Usuario sin token accede a ruta protegida
- **WHEN** un usuario sin token intenta acceder a `/operacion`
- **THEN** el sistema redirige a `/login`

#### Scenario: Token presente pero rol no definido
- **WHEN** un usuario con token pero sin rol definido intenta acceder a cualquier ruta protegida
- **THEN** el sistema redirige a `/login`

### Requirement: Extracción de rol desde JWT

El middleware DEBERÁ extraer el rol del usuario decodificando el JWT almacenado en la cookie `token`. La extracción DEBERÁ funcionar en el contexto del servidor sin acceso a localStorage.

#### Scenario: JWT válido con rol en payload
- **WHEN** el middleware recibe un JWT en la cookie con campo `rol`
- **THEN** el sistema extrae el valor del campo `rol` del payload decodificado

#### Scenario: JWT malformado
- **WHEN** el token en la cookie no es un JWT válido
- **THEN** el sistema trata el rol como null y redirige a `/login`

### Requirement: Rutas públicas excluidas del middleware

Las rutas `/login` y `/health` DEBERÁN estar excluidas de la protección por rol y permitir acceso sin autenticación.

#### Scenario: Acceso a ruta pública sin autenticación
- **WHEN** un usuario sin token accede a `/login`
- **THEN** el sistema permite el acceso sin redirección