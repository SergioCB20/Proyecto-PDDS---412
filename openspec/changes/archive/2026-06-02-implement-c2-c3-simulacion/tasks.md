## 1. C2 — ID de sesión real desde backend

- [x] 1.1 Modificar `simulacion/page.tsx`: hacer `handleIniciar` async, llamar a `POST /api/sesiones` con la configuración del formulario
- [x] 1.2 En `handleIniciar`: redirigir a `/simulacion/${res.id}` con los query params de configuración preservados
- [x] 1.3 Modificar `simulacion/[id]/page.tsx`: importar `useParams` de `next/navigation` y leer `params.id`
- [x] 1.4 Eliminar `FALLBACK_SIM_ID` y reemplazar su uso con `params.id`
- [x] 1.5 Verificar que `npm run build` pase sin errores

## 2. C3 — WebSocket + polling no duplicados

- [x] 2.1 En `simulacion/[id]/page.tsx`: desestructurar `connected` del hook `useTelemetria`
- [x] 2.2 Agregar `connected` como dependencia del `useEffect` de polling
- [x] 2.3 Condicionar el polling: solo iniciar si `estado === 'EN_CURSO' && !connected`
- [x] 2.4 Verificar que `npm run build` pase sin errores
