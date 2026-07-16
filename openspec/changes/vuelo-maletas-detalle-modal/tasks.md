## 1. Importar fetchMaletasVuelo y agregar estado

- [x] 1.1 Agregar `fetchMaletasVuelo` al import en `ModalEnvios.tsx`
- [x] 1.2 Agregar estado `maletasVuelo` con `useState<{data: Maleta[], loading: boolean, error: string | null}>`

## 2. Agregar useEffect para carga de maletas del vuelo

- [x] 2.1 Crear `useEffect` que ejecute `fetchMaletasVuelo(selectedEnvio.id)` solo cuando `open && selectedEnvio?.tipo === 'vuelo'`
- [x] 2.2 Manejar estados: inicio (loading), éxito (set data), error (set mensaje)
- [x] 2.3 Usar flag `cancelled` para evitar actualizaciones tras desmontar

## 3. Renderizar sección "Todas las maletas del vuelo"

- [x] 3.1 Renderizar sección al final del contenido del modal, solo visible para `tipo === 'vuelo'`
- [x] 3.2 Mostrar encabezado con "Todas las maletas del vuelo (X)" con el conteo total
- [x] 3.3 Mostrar spinner "Cargando maletas del vuelo..." durante carga
- [x] 3.4 Mostrar mensaje de error en contenedor rojo si falla
- [x] 3.5 Mostrar "Este vuelo no tiene maletas registradas" si array vacío

## 4. Renderizar tabla plana de maletas

- [x] 4.1 Renderizar lista/tabla con cada maleta mostrando: `codigo_maleta` (monospace), `equipaje_id_externo`, badge `virtual`/`física`, botón copiar
- [x] 4.2 Implementar badge "virtual" (ámbar) para `virtual === true` y "física" (azul) para el resto
- [x] 4.3 Implementar botón copiar con feedback Check temporal (1.5s) al portapapeles
- [x] 4.4 Asegurar contenedor con scroll (`max-h`) para listas largas

## 5. Verificar

- [x] 5.1 Ejecutar `npm run lint` y verificar que no haya errores
- [x] 5.2 Verificar que la sección NO aparece para tipo `nodo`
