# Wizard 3 pasos en modo Operación (picker → setup → mapa)

> Duración estimada: 1 día.

## Why

El modo Operación del frontend (`mode === "operacion"`) entra directo al mapa (`OperacionView` en `app/page.tsx`) sin exigir al operador declarar en qué aeropuerto físico está sentado, ni revisar la configuración de su sede antes de empezar. Para la prueba "día-a-día" (4 sedes: SPIM, SABE, EKCH, VIDP), el flujo oficial requiere:

1. **Selección de sede** (1-click wizard). Cada operador declara el aeropuerto donde corre la prueba.
2. **Seteo por sede** (capacidad de almacén adaptable por sede + carga de `planes.txt` + `envios.txt`).
3. **Mapa en vivo** (la `OperacionView` actual sin cambios funcionales).

Hoy la selección informal vive en `/recepcion` y el seteo en `/admin/prep` (full-screen, no scoped por sede). Esos dos lugares no conversan y ninguno vive dentro del flujo del modo Operación. Resultado: los operadores saltan pantallas, dejan capacidades en default, o cargan archivos sin haber elegido sede, y el instructor pierde trazabilidad de qué sede hizo qué cambio.

## What Changes

- Modo Operación arranca en un **wizard de 3 pasos** dentro del propio root `/`. Sin rutas nuevas.
- **Paso 1 (`picker`)**: grid 1-click de las 4 sedes (idénticas al pick de `app/recepcion/page.tsx`). Persistido en `localStorage` vía `device.setAeropuertoRefId(...)`.
- **Paso 2 (`setup`)**: vista por sede con:
  - Header: `IATA` + nombre + tz + reloj local en vivo (la lectura de la hora la hace el operador desde su `.txt`; el sistema sólo **muestra** la hora actual como referencia, no la adapta).
  - Capacidad numérica editable (input 1–9999, default 999). Persiste vía `POST /api/operacion/nodo/{iata}/capacidad`.
  - Uploader de planes (form-data `archivo` + `hora_presentacion` numérico) → `POST /api/operacion/plan/cargar`. Endpoints separados del original `/api/operacion/preparacion` para NO sobrescribir capacidades de las otras 3 sedes.
  - Uploader de envíos (form-data `archivo` + header `X-Device-Nodo-Id`) → `POST /api/equipajes/carga-masiva`. Endpoint ya existente.
  - Botón "Ver mapa" que habilita la entrada al paso 3.
- **Paso 3 (`mapa`)**: render actual de `OperacionView` sin cambios. Botón "Cambiar sede" disponible desde el dock para volver al paso 1.
- **Borrado**: `frontend/app/recepcion/page.tsx` se elimina. Entrada `ir-recepcion` del `DockIconos` en `app/page.tsx` también se elimina.
- **Backend**: nuevo endpoint `POST /api/operacion/nodo/{iata}/capacidad` (set capacidad por sede) + `DELETE` para restaurar al original. Nuevo endpoint `POST /api/operacion/plan/cargar` (únicamente parsea + tag_dia_a_dia; NO toca capacidades de ningún nodo). Refactor en `OperacionPreparacionService`: separar `preparar()` en `preparar()` (mantiene setCapacidades999 + parse para admin) y `cargarPlanes()` (sólo parse, para el wizard).

**No breaking changes**:
- Endpoint legacy `POST /api/operacion/preparacion` conserva comportamiento exacto (`setCapacidades999()` + parse). `/admin/prep/page.tsx` sigue funcionando idéntico.
- `GlobalExceptionHandler` y `SecurityConfig` siguen permitiendo todo (sin nuevos roles requeridos).
- Mapa y simulación intactos. Esta PR toca sólo el path `mode === "operacion"`.
- `OperacionView` (paso 3) sigue siendo el mismo JSX y consumiendo los mismos hooks; sólo cambia el wrapper que decide cuándo renderizarlo.

## Capabilities

### New Capabilities

- `wizard-operacion-picker-setup`: Capacidad nueva que describe el wizard de 3 pasos del modo Operación (picker → setup → mapa), los endpoints backend asociados (`/api/operacion/nodo/{iata}/capacidad`, `/api/operacion/plan/cargar`) y la eliminación de la ruta `/recepcion` y de la entrada de dock `ir-recepcion`.

### Modified Capabilities

Ninguna.
- `bc1-gestion-operativa`: reglas de `capacidad_almacen` y `tag_dia_a_dia` siguen iguales (no cambia el dominio, sólo cómo se cargan). No requiere `##` delta en este spec.
- `frontend-structure`: la regla "rutas mapa/simulacion/admin/" se mantiene; sólo se elimina `app/recepcion/`. No requiere `##` delta.

## Impact

- **Frontend (3 archivos modificados, 2 nuevos, 1 eliminado)**:
  - `frontend/app/page.tsx` (modificado): añade state `stage` ("picker" | "setup" | "mapa") en `OperacionView`, persistencia en `sessionStorage` con clave `operacion_setup_done_v1`, elimina entrada `ir-recepcion` del array `secciones` del dock en `OperacionView` y `SimulacionView` y `ColapsoView` (los 3 lugares donde aparece `DockIconos`).
  - `frontend/components/operacion/SedePicker.tsx` (nuevo): grid 4 cards 1-click. Recibe `onPick(iata: string) => void`. Header "Elija el aeropuerto donde está sentado".
  - `frontend/components/operacion/SetupOperacion.tsx` (nuevo): vista del paso 2. Lee `iata` desde props/state. Header con sede + tz + reloj local. Capacidad como `<Input>`. Uploader de planes con Input numérico `hora_presentacion`. Uploader de envíos. Panel de "estado actual" con `GET /api/operacion/preparacion/estado`. Botones: "Guardar capacidad", "Cargar planes", "Cargar envíos", "Ver mapa", "Cambiar sede".
  - `frontend/lib/api.ts` (modificado): 2 helpers nuevos (`setNodoCapacidadOperacion`, `cargarPlanesOperacion`). Mover/reusar el `upload` ya existente para `cargaMasivaOperacion`.
  - `frontend/app/recepcion/page.tsx` (eliminado).
- **Backend (4 archivos modificados, 2 nuevos, 0 eliminados)**:
  - `backend/backend/src/main/java/com/tasfb2b/backend/bc1/application/OperacionPreparacionService.java` (modificado): renombrar método público `preparar()` a `prepararYExpandir()` y agregar nuevo método público `cargarPlanes(file, hora)`. Extraer `getPlanOperativo()` (ya lazy desde el fix anterior) sigue intacto.
  - `backend/backend/src/main/java/com/tasfb2b/backend/bc1/application/NodoService.java` (modificado): agregar método `actualizarCapacidad(iata, capacidad)` y método `restaurarCapacidad(iata)`. Mantener constante `CAPACIDADES_ORIGINALES` con SPIM=440, SABE=460, EKCH=480, VIDP=480 (mismos valores que en `admin/prep/page.tsx` y `OperacionPreparacionService.restoreCapacidades()`).
  - `backend/backend/src/main/java/com/tasfb2b/backend/bc1/infrastructure/OperacionPreparacionController.java` (modificado): el `POST /` ahora delega a `prepararYExpandir()`. agregar `POST /planes` que delega a `cargarPlanes()`.
  - `backend/backend/src/main/java/com/tasfb2b/backend/bc1/infrastructure/OperacionCapacidadController.java` (nuevo): `POST /api/operacion/nodo/{iata}/capacidad` y `DELETE /api/operacion/nodo/{iata}/capacidad`.
  - 4 tests nuevos en `src/test/java/com/tasfb2b/backend/bc1/application/`: `OperacionCapacidadControllerTest`, `OperacionPreparacionPlanesTest`, `OperacionNodoCapacidadTest`, `OperacionPreparacionLazyPlanVuelosTest` (refuerza el fix lazy existente).
- **Sin migraciones Flyway**: el tag `tag_dia_a_dia` y el campo `capacidad_almacen` ya existen en `V5__plan_vuelos.sql` y `V11__plan_vuelos_seed.sql`.
- **Sin cambios en**: `next.config.ts` (`basePath: "/front"` no cambia), `application.properties`, `SecurityConfig` (sigue `permitAll()`), `middlewares` (no existe).

## Decisiones de diseño

1. **Stage interno en `OperacionView`, sin rutas nuevas**. Pros: deep-link via `?stage=` es opcional y se puede agregar después. Contras: al recargar la página se pierde la selección de stage si no se persiste. Mitigación: clave `operacion_setup_done_v1` en `sessionStorage` (sobrevive recargas, no nuevas pestañas).
2. **Endpoints separados (`/api/operacion/plan/cargar` vs `/preparacion`)**. Endpoints separados evitan que el wizard sobrescriba capacidades de las otras 3 sedes cuando un solo operador carga planes.TLX compartido: dos paths = doble superficie de bug, pero acota la responsabilidad. Se documenta que `/preparacion` (admin) sigue siendo "ALL 4 caps a 999 + parse" intencionalmente.
3. **Hora_presentacion manual**. El operador lee la hora_base del `.txt` y la teclea. No se autoadapta. Confirmado por el PM.
4. **Default de capacidad = 999** (no el valor original). El test día-a-día arranca con capacidad amplia para que los planes cargados puedan enrutarse rápido. Se documenta en el wizard que puede subir/bajar manualmente y persiste por sede.
5. **`role = OPERADOR_LOGISTICO` no se exige en backend nuevo**. `SecurityConfig.filterChain` tiene `auth.anyRequest().permitAll()`. Mantenemos la política actual (sin `@PreAuthorize` en controllers nuevos). Sería trabajo de una iteración futura endurecer `OPERACION_ENDPOINTS` con `hasRole('OPERADOR_LOGISTICO')`.
