## Why

La página de operación (`/operacion`) y simulación (`/simulacion/[id]`) usan datos mock (`MOCK_NODOS`, `MOCK_VUELOS`) como estado inicial y como fallback cuando falla la conexión con el backend. Esto produce tres problemas:

1. **Los formularios de crear vuelo y equipaje reciben IDs mock que no existen en la BD** — al enviar `POST /api/vuelos` o `POST /api/equipajes`, el backend responde 422 porque los `origen_id`, `destino_id` o `vuelo_id` de los datos mock no existen en PostgreSQL.
2. **Los errores reales quedan ocultos** — los `.catch(() => MOCK_NODOS)` en `fetchData` silencian cualquier error de conexión, autenticación o permiso, dando la impresión de que la página funciona cuando en realidad está desconectada del backend.
3. **La creación de equipaje crashea el frontend** — `CrearEquipajeResponse` espera un campo `plan_viaje` que el backend no retorna al registrar, provocando `TypeError` al renderizar el mensaje de éxito.

## What Changes

- Se elimina todo uso de `MOCK_NODOS`, `MOCK_VUELOS` y datos mock en la página de operación
- Los estados iniciales de nodos, vuelos y equipajes recientes comienzan como arrays vacíos
- Se eliminan los `.catch()` que ocultan errores en `fetchData`; los errores de conexión/permisos se muestran al usuario
- Se corrige el tipo `CrearEquipajeResponse` en `frontend/lib/types.ts` para que coincida con la respuesta real del backend (`{ id, estado, id_externo, destino_iata }`)
- Se simplifica el bloque de éxito al crear equipaje eliminando la dependencia de `plan_viaje`
- Se agrega estado `apiError` y un banner rojo visible en la UI para errores de conexión
- Se crea `frontend/.env.local` con la URL de la API

## Capabilities

### New Capabilities

- *(ninguna — es una corrección sobre funcionalidad existente)*

### Modified Capabilities

- `registro-equipaje`: La creación individual de equipaje ahora muestra correctamente el mensaje de éxito sin crashear
- `creacion-vuelo`: El formulario de vuelo ahora recibe datos reales del backend en lugar de mock data
- `fetch-operacion`: El polling de datos ahora expone errores de conexión al usuario en vez de ocultarlos con fallback mock
- `carga-masiva`: *(sin cambios)*

## Impact

- `frontend/lib/types.ts` — corregir `CrearEquipajeResponse` (eliminar `plan_viaje`)
- `frontend/app/operacion/page.tsx` — eliminar imports mock, inicializar estados vacíos, eliminar `.catch()` fallback, simplificar éxito de equipaje, agregar banner de error
- `frontend/.env.local` — archivo nuevo con `NEXT_PUBLIC_API_URL`
- Sin cambios en backend
