# sesion-id-real
> **Spec owner:** Frontend Lead
> **Estado:** Draft v1
> **Última actualización:** 02/06/2026
> **Consumidores:** Frontend devs implementan

## Requisitos

### Requirement: Crear sesión desde formulario

El formulario de configuración en `/simulacion` SHALL llamar a `POST /api/sesiones` con la configuración del formulario al hacer clic en "Iniciar Simulación".

#### Scenario: Creación exitosa
- **WHEN** el usuario completa el formulario y hace clic en "Iniciar Simulación"
- **THEN** el sistema llama a `POST /api/sesiones` con la configuración y redirige a `/simulacion/{uuid}` donde `uuid` es el ID devuelto por el backend

#### Scenario: Error al crear
- **WHEN** el backend retorna un error (4xx/5xx)
- **THEN** el sistema muestra un mensaje de error y no redirige

### Requirement: Leer ID de sesión de la ruta

La página `/simulacion/[id]` SHALL leer el parámetro `id` de la ruta (`params.id`) para identificar la sesión activa.

#### Scenario: Carga correcta
- **WHEN** la ruta es `/simulacion/abc-123-def`
- **THEN** `params.id` es `"abc-123-def"` y se usa para todas las llamadas a API y WebSocket

#### Scenario: Sin ID en ruta
- **WHEN** no hay `id` en la ruta
- **THEN** el sistema no intenta cargar datos y muestra un estado vacío o error
