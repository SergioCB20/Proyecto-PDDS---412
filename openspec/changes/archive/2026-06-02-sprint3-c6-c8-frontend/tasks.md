## 1. Migrar proxy.ts a middleware funcional

- [x] 1.1 Verificar que `frontend/proxy.ts` tenga la lógica de protección de rutas correcta (Next.js 16 usa `proxy.ts`, no `middleware.ts`)
- [x] 1.2 Verificar que el middleware maneje correctamente el basePath `/front`
- [x] 1.3 Verificar que las rutas públicas (`/login`, `/health`) no requieran token

## 3. Mapear tipos en operacion/page.tsx

- [x] 3.1 Importar `VueloEnMapa` en `frontend/app/operacion/page.tsx`
- [x] 3.2 Mapear `allVuelos` de `Vuelo[]` a `VueloEnMapa[]` en `fetchData()` usando spread operator

## 4. Verificación

- [x] 4.1 Ejecutar `npm run build` sin errores de compilación
- [x] 4.2 Verificar que el middleware redirige correctamente según el rol (proxy.ts reconocido como ƒ Proxy (Middleware) en build output)
