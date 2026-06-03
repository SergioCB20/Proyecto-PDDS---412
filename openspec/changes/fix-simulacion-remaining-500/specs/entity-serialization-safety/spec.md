## ADDED Requirements

### Requirement: Prevención de LazyInitializationException en Vuelo
La entidad `Vuelo` SHALL evitar que la relación LAZY `planVuelos` sea serializada por Jackson, para prevenir `LazyInitializationException` durante la serialización de respuestas HTTP.

#### Scenario: Jackson serializa Vuelo sin acceder a planVuelos
- **WHEN** Jackson serializa una instancia de `Vuelo` (ej: a través de un getter público)
- **THEN** la propiedad `planVuelos` NO SHALL ser accedida/inicializada por Jackson
- **AND** no se lanza `LazyInitializationException`

### Requirement: Tolerancia general a lazy loading fuera de transacciones
El sistema SHALL configurar Hibernate para permitir lazy loading fuera de transacciones activas, como safety net general.

#### Scenario: Consulta JPA con lazy loading fuera de transacción
- **WHEN** se ejecuta una consulta JPA que retorna entidades con relaciones LAZY
- **AND** la relación LAZY es accedida fuera de una transacción activa
- **THEN** Hibernate inicializa el proxy sin lanzar `LazyInitializationException`

## MODIFIED Requirements

### Requirement: IllegalStateException manejada globalmente
El sistema SHALL manejar `IllegalStateException` a nivel global, retornando HTTP 400 con cuerpo estructurado.

#### Scenario: Iniciar sesión con estado inválido
- **WHEN** se ejecuta `POST /api/sesiones/{id}/iniciar` y la sesión no está en estado `CONFIGURADA` o `PAUSADA`
- **THEN** se retorna HTTP 400 con `{ status: 400, error: "ESTADO_INVALIDO", mensaje: "..." }`

#### Scenario: Iniciar sesión cuando ya existe otra EN_CURSO
- **WHEN** se ejecuta `POST /api/sesiones/{id}/iniciar` y ya existe otra sesión en estado `EN_CURSO`
- **THEN** se retorna HTTP 400 con `{ status: 400, error: "ESTADO_INVALIDO", mensaje: "..." }`

### Requirement: Protección de clonarPlantillas contra fallos
El sistema SHALL proteger la llamada a `vueloService.clonarPlantillas()` en `SesionService.iniciarSesion()` con try-catch para evitar 500 si la operación falla.

#### Scenario: clonarPlantillas falla por esquema BD incompleto
- **WHEN** se ejecuta `POST /api/sesiones/{id}/iniciar` y `clonarPlantillas()` lanza una excepción
- **THEN** se registra un warn en logs
- **AND** la sesión inicia correctamente (sin vuelos clonados)
- **AND** la respuesta HTTP no es 500

### Requirement: Null-safety para duracionDias en iniciarSesion
El sistema SHALL usar un valor por defecto de 5 días si `sesion.getDuracionDias()` es null en `SesionService.iniciarSesion()`.

#### Scenario: Sesión sin duración definida
- **WHEN** se ejecuta `POST /api/sesiones/{id}/iniciar` y `duracion_dias` es NULL
- **THEN** se usa 5 días como duración por defecto
- **AND** la respuesta HTTP no es 500
