## 1. Agregar funcion matchEstadoVuelo

- [x] 1.1 En `frontend/app/simulacion/[id]/page.tsx`, agregar funcion `matchEstadoVuelo` que valide runtime el string contra los valores conocidos y retorne el tipo seguro con fallback a `'PROGRAMADO'`

## 2. Reemplazar cast inseguro

- [x] 2.1 En el `useMemo` de `vuelos` (linea ~80), reemplazar `v.estado as VueloEnMapa['estado']` por `matchEstadoVuelo(v.estado)`

## 3. Verificar compilacion

- [x] 3.1 Ejecutar `npm run build` en frontend y confirmar que compila sin errores
