## 1. Preparación

- [x] 1.1 Verificar estructura actual del middleware y auth helper
- [x] 1.2 Documentar el estado actual del código

## 2. Implementación de parseo JWT

- [x] 2.1 Crear función `parseJwtFromCookie(cookieValue: string)` en `lib/auth.ts`
- [x] 2.2 Implementar decodificación base64url del payload JWT
- [x] 2.3 Extraer campo `rol` del payload decodificado
- [x] 2.4 Manejar casos de JWT malformado o sin campo rol

## 3. Actualización del middleware

- [x] 3.1 Importar la función de parseo JWT en middleware.ts
- [x] 3.2 Reemplazar `auth.getRol()` por la nueva función de parseo de cookie
- [x] 3.3 Asegurar que `/simulacion` cubre `/simulacion/[id]`
- [x] 3.4 Probar flujo de redirección por rol incorrecto

## 4. Documentación y marcado

- [x] 4.1 Marcar C3 como completada en `TAREAS_FRONTEND.md`