## Context

El middleware actual de Next.js (`frontend/middleware.ts`) usa `auth.getRol()` desde `lib/auth.ts`, pero `getRol()` solo lee del localStorage del cliente. En el middleware (lado servidor), `localStorage` no está disponible, por lo que necesitamos parsear el JWT directamente del cookie para extraer el rol.

El flujo actual:
1. Login almacena token en localStorage Y en cookie
2. El middleware lee la cookie
3. Pero `auth.getRol()` no puede ejecutarse en el servidor

Solución: Parsear el JWT en el servidor usando una función auxiliar que decodifique el payload sin verificar la firma (el backend ya lo verifica al recibir requests).

## Goals / Non-Goals

**Goals:**
- Extraer el rol del JWT en el middleware (lado servidor)
- Validar que el usuario tiene acceso a la ruta según su rol
- Redirigir a `/login` si no hay token o rol incorrecto
- Mantener la experiencia de login existente

**Non-Goals:**
- No cambiar cómo el login almacena el token
- No implementar validación de firma en frontend (el backend ya lo hace)
- No agregar nuevos endpoints de API

## Decisions

1. **Parsear JWT sin verificación de firma**: El JWT ya fue verificado por el backend al emitirlo. En el frontend solo necesitamos extraer el payload para obtener el rol. Alternativa: hacer request al backend para validar — rechazado por performance.

2. **Usar atob() para decodificar base64**: Los JWT de JJWT usan el encoding estándar base64url. Podemos decodificar el payload sin biblioteca externa. Alternativa: instalar `jwt-decode` — rechazado para evitar dependencias adicionales.

3. **Mantener RUTAS_POR_ROL como source of truth**: El objeto `RUTAS_POR_ROL` define qué rutas pertenecen a cada rol. Esto facilita mantenimiento futuro.

4. **Soportar rutas anidadas con startsWith**: `/simulacion` cubre `/simulacion/[id]` porque todas las rutas de simulación empiezan con ese prefijo.

## Risks / Trade-offs

- [Riesgo] Token manipulado en cliente → Mitigación: El backend siempre valida la firma al recibir requests API. Si el token fue manipulado, las llamadas API fallarán.
- [Riesgo] JWT expira mientras el usuario navega → Alternativa: implementar refresh token — no en scope, pero podemos mejorar más adelante.
- [Trade-off] Sin verificación de firma en middleware → Aceptable: la verificación de seguridad real está en el backend.