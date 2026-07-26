# Spec delta — wizard-operacion-picker-setup

## Purpose

Definir el comportamiento del wizard de 3 pasos del modo Operación: selección de sede → setup por sede → mapa en vivo.

## Requirements

### Requirement: Wizard state machine

El modo Operación (`mode === "operacion"` en `app/page.tsx`) MUST renderizar internamente un wizard con 3 estados secuenciales:

- **Stage "picker"**: primera pantalla cuando NO hay sede seleccionada (`device.getAeropuertoRefId()` retorna `""` o `null`).
- **Stage "setup"**: pantalla intermedia una vez seleccionada una sede, mientras `sessionStorage.operacion_setup_done_v1` !== `"1"`.
- **Stage "mapa"**: pantalla final una vez `sessionStorage.operacion_setup_done_v1 === "1"`.

El stage inicial MUST calcularse desde `(sedeSeleccionada, sessionStorage.operacion_setup_done_v1)`. Tras F5, el MUST restaurar el stage:
- Sin sede → picker.
- Con sede + setup_done → mapa.
- Con sede + sin setup_done → setup.

### Requirement: Stage transitions

- picker → setup: usuario hace 1-click en una card del picker. La sede elegida MUST persistirse vía `device.setAeropuertoRefId(iata)`.
- setup → mapa: usuario hace click en "Siguiente → Ver mapa". MUST escribir `sessionStorage.operacion_setup_done_v1 = "1"`.
- mapa → picker: usuario hace click en "Cambiar sede" desde el dock (ya implementado). MUST limpiar `device.setAeropuertoRefId("")` y `sessionStorage.removeItem("operacion_setup_done_v1")`.

### Requirement: Picker 4-sede (1-click)

`SedePicker` MUST renderizar un grid de exactamente 4 cards, una por cada sede: SPIM (Lima), SABE (Buenos Aires), EKCH (Copenhague), VIDP (Delhi). Cada card MUST incluir:
- Código IATA en grande, mono, color `text-blue-600`.
- Nombre descriptivo.
- Abreviatura de zona horaria (vía `tzAbrev(iata)`).

Click en cualquier card MUST invocar `onPick(iata)` (sin confirmación adicional). El botón "Volver" arriba-izquierda MUST llevar a `router.push("/")`.

### Requirement: Setup por sede — campos obligatorios

`SetupOperacion` MUST mostrar para la sede actual (`iata` recibido por props):

1. **Header**: pill azul con IATA + nombre + tz + reloj local en vivo + botón "Cambiar sede".
2. **Capacidad**: input numérico (rango 1–9999, default 999) con botón "Guardar capacidad". Persiste vía `POST /api/operacion/nodo/{iata}/capacidad` con body `{ capacidad: number }`.
3. **Planes**: input file (.txt/.csv) + input numérico `hora_presentacion` (rango 0–23, label "Hora presentación (hora local de Lima)") con texto de ayuda "Esta hora la lee Ud. de su archivo y la teclea manualmente. El sistema NO la adapta." + botón "Cargar planes". Persiste vía `POST /api/operacion/plan/cargar` con form-data `archivo` + `hora_presentacion`.
4. **Envíos**: input file (.txt/.csv) + botón "Cargar envíos". Persiste vía `POST /api/equipajes/carga-masiva` con form-data `archivo` + header `X-Device-Nodo-Id`.

### Requirement: Navegación habilitada por archivos cargados

El botón "Siguiente → Ver mapa" en `SetupOperacion` MUST estar deshabilitado hasta que al menos uno de: `planes_tag_count > 0` o `envios_tag_count > 0` (reflejado en `estado` cargado desde `GET /api/operacion/preparacion/estado`). El estado MUST refrescarse después de cada carga exitosa (volver a llamar el endpoint).

### Requirement: Backend — capacidad por sede

`POST /api/operacion/nodo/{iata}/capacidad` MUST aceptar body `{ capacidad: int }` (validación 1..9999), actualizar `nodos_logisticos.capacidad_almacen WHERE codigo_iata = iata`, y retornar el `NodoResponse` actualizado. Devuelve 400 si la capacidad está fuera de rango; 404 si la `iata` no existe.

`DELETE /api/operacion/nodo/{iata}/capacidad` MUST restaurar `capacidad_almacen` al valor original del nodo (`CAPACIDADES_ORIGINALES`: SPIM=440, SABE=460, EKCH=480, VIDP=480). Devuelve el `NodoResponse` actualizado o 404 si la `iata` no existe.

### Requirement: Backend — carga de planes sin tocar capacidades

`POST /api/operacion/plan/cargar` MUST aceptar form-data `archivo` + `hora_presentacion`, parsear el archivo con la lógica existente (`parseAndSavePlanes`), y retornar `{ planes_cargados: number, tag: "tag_dia_a_dia" }`. MUST NO invocar `setCapacidades999()` ni modificar `capacidad_almacen` de ningún nodo. Si el `PlanVuelos` base no existe → `IllegalStateException("No existe PlanVuelos base. Verificar seeds")` → 400 vía `GlobalExceptionHandler`.

### Requirement: Backend — preserva comportamiento admin

`POST /api/operacion/preparacion` (legacy, sin cambios de contrato) MUST seguir llamando `prepararYExpandir()` que ejecuta `setCapacidades999()` + `parseAndSavePlanes` + `equipajeRepository.deleteByTag("tag_dia_a_dia")`. La página `/admin/prep` MUST seguir funcionando idéntica.

### Requirement: Eliminación de `/recepcion`

`frontend/app/recepcion/page.tsx` MUST eliminarse. La entrada `ir-recepcion` del `DockIconos` en `app/page.tsx` MUST eliminarse de los 3 arrays `secciones` (uno por cada vista: `OperacionView`, `SimulacionView`, `ColapsoView`). MUST NO quedar referencias huérfanas (`grep "/recepcion" frontend/` retorna 0 después del cambio).

### Requirement: Persistencia por dispositivo

El estado del wizard (`sedeSeleccionada`, `setup_done`) MUST persistir por dispositivo (vía `device.getAeropuertoRefId()` en localStorage). Compartir entre pestañas NO es objetivo — `sessionStorage` para `setup_done` por pestaña.

### Requirement: Visual coherente

Todos los componentes nuevos (`SedePicker`, `SetupOperacion`) MUST usar las mismas primitivas UI existentes en el proyecto: `Button`, `Input`, `Card` (de `@/components/ui/*`), `Building2`, `Clock`, `Package`, `ArrowLeft` (de `lucide-react`), `tzAbrev`, `formatLocal`, `useReloj` (de `@/lib/*`).

### Requirement: Sin cambios breaking

- Modos `simulacion` y `colapso` MUST quedar sin cambios.
- `OperacionView` (paso 3) MUST seguir usando el mismo JSX existente — sólo cambia el wrapper que decide cuándo renderizarlo según `stage === "mapa"`.
- Endpoint `/api/operacion/preparacion` y página `/admin/prep` MUST quedar sin cambios de comportamiento.
- `SecurityConfig` MUST quedar sin cambios. `GlobalExceptionHandler` puede recibir 1 handler adicional (para `NodoService.NodoNoEncontradoException` si no existe ya).
