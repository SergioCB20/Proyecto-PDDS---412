## Why

Tarea C3 del backlog de frontend requiere mejorar el middleware de protección de rutas existente. Actualmente el middleware solo verifica la cookie `token` pero no extrae el rol del JWT ni valida que el usuario tenga acceso a la ruta según su rol. Necesitamos una implementación robusta que lea el token, valide su autenticidad, y restrinja el acceso por rol.

## What Changes

- Extraer el rol del JWT almacenado en la cookie `token`
- Validar el JWT usando la misma secret key del backend
- Proteger rutas:
  - `/admin` → solo ADMINISTRADOR
  - `/simulacion` y `/simulacion/[id]` → solo ANALISTA
  - `/operacion` → solo OPERADOR_LOGISTICO
- Redirigir a `/login` si no hay token o el rol no corresponde a la ruta
- Soportar rutas con wildcards para `/simulacion/[id]`

## Capabilities

### New Capabilities
- `middleware-autenticacion-roles`: Middleware de Next.js que valida JWT y protege rutas por rol de usuario.

### Modified Capabilities
- `frontend-structure.md`: Actualizar sección de Middleware para documentar la extracción de rol del JWT y validación.
- `TAREAS_FRONTEND.md`: Marcar C3 como completada.

## Impact

- Archivo modificado: `frontend/middleware.ts`
- Archivo modificado: `frontend/lib/auth.ts` (añadir función para parsear JWT)
- Archivo modificado: `openspec/specs/TAREAS_FRONTEND.md` (marcar C3 como completada)
- Dependencias: jwt-decode o implementación manual de parseo de JWT