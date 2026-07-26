## Context

El modo Operación del frontend (`mode === "operacion"` en `app/page.tsx:113`) renderiza `OperacionView` directamente sin pedir información contextual del operador. Para el operativo "día-a-día" (4 sedes) los operadores deben (a) declarar la sede donde están (b) configurar capacidad + cargar planes/envios antes de empezar a volar.

Hoy ambas cosas viven fuera del flujo del modo Operación:

- Selección informal: `app/recepcion/page.tsx` (grid 4-sede + form de registro individual + carga masiva CSV + lista de recientes). Funciona como página suelta, no integrada al modo Operación.
- Seteo centralizado: `app/admin/prep/page.tsx` (cap full-screen `setCapacidades999()` + uploader global de planes). Es del administrador, no del operador.

Los operadores usan el sistema saltando entre ambas pantallas, sin que el sistema recuerde su sede en el flujo del mapa. Resultado: capacidad siempre en default, archivos sin contexto de sede, instructor sin trazabilidad.

## Goals / Non-Goals

**Goals**:

1. Cuando un usuario entra al modo Operación (tab `Operación` en Navbar o URL `/`), la **primera pantalla** que ve es un picker **1-click** de las 4 sedes.
2. Tras elegir sede, se le presenta **una vista de setup por sede** donde puede:
   - Ver `IATA + nombre + tz + hora local en vivo`.
   - Cambiar capacidad numérica por sede (input 1–9999, default 999).
   - Subir archivo `planes.txt` con `hora_presentacion` que el operador teclea manualmente (sin autoadapt).
   - Subir archivo `envios.txt` (per-sede vía `X-Device-Nodo-Id`).
   - Avanzar al mapa.
3. El seteo anterior **no toca las capacidades de las otras 3 sedes** (sólo la del operador actual).
4. La carga de planes es **per-sede por su origen** (los planes globales siguen marcando tag `tag_dia_a_dia` y se pueden limpiar todos al final como hoy).
5. Tras el setup, el operador entra al mapa. Puede "Cambiar sede" desde el dock para volver al paso 1.

**Non-Goals**:

- No requiere login real (`SecurityConfig.filterChain` sigue siendo `permitAll`). El wizard es Device-based, igual que `/recepcion` actual.
- No cambia la simulación (`mode === "simulacion"`) ni el modo colapso.
- No cambia `OperacionView` (paso 3) — el JSX existente se reutiliza tal cual.
- No introduce nuevas rutas en Next.js: el wizard vive dentro del root `/` y usa state interno + `sessionStorage`.
- No introduce `@PreAuthorize` ni cambios en `SecurityConfig`.
- No toca migraciones Flyway.
- No cambia el endpoint legacy `/api/operacion/preparacion` (admin sigue funcionando idéntico).

## Decisions

### 1. State-machine interna en `OperacionView` (`stage: "picker" | "setup" | "mapa"`)

**Por qué**: rutas nuevas (`/operacion/setup/...`) requieren crear App Router entries + middleware + tests de routing. Un switch interno basta. Persistencia: clave `operacion_setup_done_v1` en `sessionStorage` — sobrevive F5, no nuevas pestañas.

**Trade-off**: deep-link (`/seleccionar-sede`) más difícil. Aceptable porque el flujo es intencionalmente guiado.

### 2. Endpoints separados: `/preparacion` (admin) vs `/plan/cargar` (wizard)

`OperacionPreparacionService.preparar()` actualmente llama `setCapacidades999()` (los 4 aeropuertos a 999) y luego parsea planes. Si el wizard reusase este endpoint, cargar planes desde el setup del operador SPIM **borraría** la capacidad original de SABE/EKCH/VIDP. Eso rompe el aislamiento del wizard.

**Decisión**: refactor mínimo. Renombrar `preparar()` a `prepararYExpandir()` (admin bulk) y agregar `cargarPlanes(file, hora)` que sólo parsea. Nuevo endpoint `POST /api/operacion/plan/cargar` que delega a `cargarPlanes`.

### 3. Capacidad por sede vía `POST /api/operacion/nodo/{iata}/capacidad`

**Decisión**: endpoint dedicado que llama `nodoRepository.findByCodigoIata(iata) → setCapacidadAlmacen → save`. Validación `@Min(1) @Max(9999)` en el request. `DELETE` restaura al valor original (constante `CAPACIDADES_ORIGINALES` en `NodoService`: SPIM=440, SABE=460, EKCH=480, VIDP=480 — mismos valores que ya están en `OperacionPreparacionService.restoreCapacidades()` y `admin/prep/page.tsx:101`).

### 4. `app/recepcion/page.tsx` eliminado, entrada `ir-recepcion` removida del dock

**Decisión**: el dock de la izquierda en `OperacionView` (y en `SimulacionView`/`ColapsoView`) tiene una entrada `ir-recepcion` con icono `Package` que apunta a `/recepcion`. Como `/recepcion` ya no existe, se eliminan las 3 entradas.

### 5. Hora_presentacion manual

No se autoadapta. Es responsabilidad del operador leer la `HO` del `.txt` y teclearla entera (HH o HH:MM). El wizard muestra un `<Input type="number" min={0} max={23} />` con label "Hora presentación (hora local de Lima)" — mismo label que `admin/prep/page.tsx:158`.

### 6. `SedePicker` y `SetupOperacion` como componentes separados (no inline)

**Por qué**: componentes inline en `app/page.tsx` ya pesan 1900+ líneas. Extraer mantiene `OperacionView` legible y `SedePicker` se puede reusar en futuro onboarding admin. Tamaño estimado: `SedePicker.tsx` ~80 líneas, `SetupOperacion.tsx` ~250 líneas.

## Risks / Trade-offs

- **Persistencia en `sessionStorage` no comparte entre pestañas**. Si el operador abre 2 pestañas y elige SPIM en una y EKCH en la otra, ambas inician pasos1/2 independientemente. Aceptable porque el flujo es por-sede-por-dispositivo.
- **`OperacionPreparacionController.postMapping` actual aún permite que `/preparacion` siga siendo "ALL caps + parse".** Riesgo: futuros devs lo usan como atajo y olvidan que rompe aislamiento. Mitigación: doc en javadoc del método.
- **`@PreAuthorize` no exigido**. Cualquier request sin token puede llamar `POST /api/operacion/plan/cargar` o `POST /api/operacion/nodo/SPIM/capacidad`. Mismo nivel de exposición que el resto del backend actual. Out of scope.
- **Refactor en `OperacionPreparacionService.preparar()` puede romper `/admin/prep/page.tsx`** si el rename no se aplica correctamente. Mitigación: el call site en `OperacionPreparacionController` debe actualizar el delegate; tests de integración (`OperacionPreparacionControllerTest` no existe aún, agregar uno nuevo).
- **Eliminación de `app/recepcion/page.tsx` deja 1 archivo menos y reduce confusión** pero también rompe cualquier deep-link externo a `/recepcion`. Aceptable porque no releaseamos antes de exponer el wizard.
- **`uploader de envíos` se llama con `X-Device-Nodo-Id`**, header ya soportado por `CargaMasivaService.cargaMasivaConfirm()`. `getDeviceNodoId()` que ya existe en `app/recepcion/page.tsx:174` debe moverse a `SetupOperacion`.

## Concretos por archivo

> Las líneas son referencia actual (post-fix de lazy `getPlanOperativo`). El implementador debe verificar offsets porque la rama puede haber sido editada.

### Frontend

**`frontend/app/page.tsx`** (~1900 líneas, corte en `OperacionView`):

- En `OperacionView`: agregar después de las declaraciones de state existentes (~L233):
  ```tsx
  const [stage, setStage] = useState<"picker" | "setup" | "mapa">(() => {
    const stored = device.getAeropuertoRefId();
    if (!stored) return "picker";
    return sessionStorage.getItem("operacion_setup_done_v1") === "1" ? "mapa" : "setup";
  });
  ```
- Render condicional (`stage === "picker"` → `<SedePicker onPick={(iata) => { device.setAeropuertoRefId(iata); sessionStorage.removeItem("operacion_setup_done_v1"); setStage("setup"); }} />`).
- Render condicional para `stage === "setup"` → `<SetupOperacion iata={...} onListo={() => { sessionStorage.setItem("operacion_setup_done_v1", "1"); setStage("mapa"); }} onCambiarSede={() => { device.setAeropuertoRefId(""); sessionStorage.removeItem("operacion_setup_done_v1"); setStage("picker"); }} />`.
- `stage === "mapa"` → mantiene todo el JSX existente (`<OperacionViewInternal>` extraído a un subcomponente, o un fragment condicional envolviendo el JSX actual).
- Eliminar entrada `{ id: 'ir-recepcion', icon: Package, label: 'Ir a Recepción', variant: 'action' }` del array `secciones` de `DockIconos` en las 3 vistas (~L769 de `OperacionView`, ~L1305 de `SimulacionView`, etc.).

**`frontend/components/operacion/SedePicker.tsx`** (nuevo, ~80 líneas):

```tsx
"use client";
import { device } from "@/lib/device";
import { Button } from "@/components/ui/Button";
import { Building2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { tzAbrev } from "@/lib/timezone";

const SEDES = [
  { iata: "SPIM", nombre: "Lima (Perú)" },
  { iata: "SABE", nombre: "Buenos Aires (Argentina)" },
  { iata: "EKCH", nombre: "Copenhague (Dinamarca)" },
  { iata: "VIDP", nombre: "Delhi (India)" },
];

export function SedePicker({ onPick }: { onPick: (iata: string) => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <button onClick={() => router.push("/")} className="mb-4 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 shadow border ...">
        <ArrowLeft size={13} /> Volver
      </button>
      <div className="max-w-2xl mx-auto text-center mb-8">
        <Building2 size={48} className="mx-auto text-blue-600 mb-3" />
        <h1 className="text-2xl font-bold ...">¿En qué aeropuerto está sentado?</h1>
        <p className="...">(1-click por sede. La sesión se inicia con esta elección.)</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SEDES.map(s => (
          <button key={s.iata} onClick={() => onPick(s.iata)} className="p-5 bg-white ... rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all">
            <div className="text-2xl font-bold text-blue-600 font-mono">{s.iata}</div>
            <div className="text-sm ...">{s.nombre}</div>
            <div className="text-xs text-slate-500 mt-1">{tzAbrev(s.iata)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

**`frontend/components/operacion/SetupOperacion.tsx`** (nuevo, ~250 líneas):

- Hooks: `useState` para `capacidad` (string), `planesFile` (File | null), `enviosFile` (File | null), `horaPresentacion` ("11"), `loading` (string: "" | "capacidad" | "planes" | "envios"), `error`, `success`, `estado` (Map<string, object>).
- `useEffect` para cargar `GET /back/api/operacion/preparacion/estado` al montar (mismo patrón que `admin/prep/page.tsx:33`).
- Reloj local: `useReloj()` (ya exportado en `app/page.tsx:91`, o importar de `lib/useReloj` si se extrae).
- `tzAbrev(sede.iata)` y `formatLocal(sede.iata, hora)` para mostrar la hora local en vivo.
- Header render: pill azul con IATA + nombre + tz + `<Clock />` + `formatearFechaHora(hora)`.
- Botón "Cambiar sede" top-right (mismo estilo que `recepcion/page.tsx:260`).
- Card "1. Capacidad de almacén":
  - `<Input>` numérico 1–9999 + botón "Guardar capacidad".
  - onClick llama `api.post<{ capacidad_almacen: number }>(`/operacion/nodo/${iata}/capacidad`, { capacidad: Number(capacidad) })`. En éxito, toast verde y refrescar `estado`.
- Card "2. Planes de vuelo (tag_dia_a_dia)":
  - `<Input type="file" accept=".txt,.csv" />` para `archivo`.
  - `<Input type="number" min={0} max={23}>` para `hora_presentacion` con label "Hora presentación (hora local de Lima)" + ayuda textual "Esta hora la lee Ud. de su archivo y la teclea manualmente. El sistema NO la adapta."
  - Botón "Cargar planes" → `fetch(`${BASE}/operacion/plan/cargar`, { method: 'POST', body: formData, headers: { 'X-Device-Id': device.getId() } })` usando patrón de `admin/prep/page.tsx:55` (ya que necesita multipart sin Content-Type automático). NO usar `api.upload` porque ese helper pone `Content-Type: 'application/json'` (ver `lib/api.ts:25`).
- Card "3. Envíos (tag_dia_a_dia)":
  - `<Input type="file" accept=".txt,.csv" />` para `archivo`.
  - Botón "Cargar envíos" → usar `api.upload` (ya soporta FormData) con `formData.append("archivo", file)` + headers `{ "X-Device-Nodo-Id": await getDeviceNodoId() }`.
  - `getDeviceNodoId()`: copiar el patrón de `app/recepcion/page.tsx:174` (helper privado que resuelve el UUID del nodo vía `GET /nodos`).
- Card "4. Estado actual": leerde `GET /back/api/operacion/preparacion/estado` y mostrar:
  - "Capacidad actual: X (default 999)" — OK/Warn según valor leído.
  - "Planes tag_dia_a_dia: N"
  - "Envíos tag_dia_a_dia: N"
  - Mensaje contextual si está en `enPrep`.
- Botón grande verde "Siguiente → Ver mapa" (full width), deshabilitado si `loading` o si `planes_tag_count == 0 && envios_tag_count == 0` (regla MVP: que suba al menos un archivo antes de pasar).
- Si `planes_tag_count > 0 || envios_tag_count > 0`: mostrar mensaje ámbar "Tienes N archivos de prueba cargados. Si cambias de sede sin restaurar, se borrarán con tag_dia_a_dia en /admin/prep."

**`frontend/lib/api.ts`** (modificado, agregar):

```ts
export async function setNodoCapacidadOperacion(iata: string, capacidad: number): Promise<{ capacidad_almacen: number }> {
  return api.post(`/operacion/nodo/${encodeURIComponent(iata)}/capacidad`, { capacidad });
}

export async function cargarPlanesOperacion(file: File, horaPresentacion: number): Promise<{ planes_cargados: number; tag: string }> {
  const fd = new FormData();
  fd.append("archivo", file);
  fd.append("hora_presentacion", String(horaPresentacion));
  // El upload usa fetch directo (no api.upload) para evitar que el Content-Type default del helper se aplique.
  const res = await fetch(`${BASE_URL}/operacion/plan/cargar`, {
    method: "POST",
    headers: { "X-Device-Id": device.getId() },
    body: fd,
  });
  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({ status: res.status, error: "ERROR", mensaje: res.statusText }));
    throw err;
  }
  return res.json();
}
```

**`frontend/app/recepcion/page.tsx`** (eliminado): el archivo entero se borra. Sin referencias huérfanas (verificar con grep `recepcion` en app/, components/, lib/, `package.json` no debe tener scripts que referencien esta ruta).

### Backend

**`OperacionPreparacionService.java`** (modificado):

```java
public Map<String, Object> prepararYExpandir(MultipartFile archivoPlanes, Integer horaPresentacion) {
    setCapacidades999();   // comportamiento legacy
    int planesCargados = parseAndSavePlanes(archivoPlanes, horaPresentacion);
    int equipajesEliminados = equipajeRepository.deleteByTag(TAG_DIA_A_DIA);
    return Map.of("capacidades", "999", "planes_cargados", planesCargados, "equipajes_limpiados", equipajesEliminados, "tag", TAG_DIA_A_DIA);
}

public Map<String, Object> cargarPlanes(MultipartFile archivoPlanes, Integer horaPresentacion) {
    int planesCargados = parseAndSavePlanes(archivoPlanes, horaPresentacion);
    return Map.of("planes_cargados", planesCargados, "tag", TAG_DIA_A_DIA);
}
```

`preparar()` pasa a llamarse `prepararYExpandir()` y actualiza el único call site en `OperacionPreparacionController`.

**`NodoService.java`** (modificado):

```java
private static final Map<String, Integer> CAPACIDADES_ORIGINALES = Map.of(
    "SPIM", 440, "SABE", 460, "EKCH", 480, "VIDP", 480
);

public NodoResponse actualizarCapacidad(String iata, Integer capacidad) {
    if (capacidad == null || capacidad < 1 || capacidad > 9999) {
        throw new IllegalArgumentException("capacidad fuera de rango 1–9999");
    }
    NodoLogistico nodo = nodoRepository.findByCodigoIata(iata)
        .orElseThrow(() -> new NodoNoEncontradoException("Nodo no encontrado: " + iata));
    nodo.setCapacidadAlmacen(capacidad);
    return toResponse(nodoRepository.save(nodo));
}

public NodoResponse restaurarCapacidad(String iata) {
    Integer original = CAPACIDADES_ORIGINALES.get(iata);
    if (original == null) throw new NodoNoEncontradoException("Sin capacidad original conocida para " + iata);
    return actualizarCapacidad(iata, original);
}

public record CapacidadRequest(@JsonProperty("capacidad") Integer capacidad) {}
```

`GlobalExceptionHandler` ya maneja `IllegalArgumentException` → 400 con `ARGUMENTO_INVALIDO`. Agregar handler para `NodoService.NodoNoEncontradoException` → 404 → ojo, ya existe handler similar para `EquipajeService.EquipajeNoEncontradoException`. Reusar el patrón.

**`OperacionPreparacionController.java`** (modificado):

```java
@PostMapping  // POST /api/operacion/preparacion (admin)
public ResponseEntity<Map<String, Object>> preparar(
        @RequestParam("archivo") MultipartFile archivo,
        @RequestParam("hora_presentacion") Integer horaPresentacion) {
    return ResponseEntity.ok(service.prepararYExpandir(archivo, horaPresentacion));
}

@PostMapping("/planes")  // POST /api/operacion/preparacion/planes (wizard)
public ResponseEntity<Map<String, Object>> cargarPlanes(
        @RequestParam("archivo") MultipartFile archivo,
        @RequestParam("hora_presentacion") Integer horaPresentacion) {
    return ResponseEntity.ok(service.cargarPlanes(archivo, horaPresentacion));
}

// /restaurar y /estado quedan idénticos
```

**`OperacionCapacidadController.java`** (nuevo):

```java
package com.tasfb2b.backend.bc1.infrastructure;
import com.tasfb2b.backend.bc1.application.NodoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/operacion/nodo")
public class OperacionCapacidadController {
    private final NodoService nodoService;
    public OperacionCapacidadController(NodoService nodoService) { this.nodoService = nodoService; }

    @PostMapping("/{iata}/capacidad")
    public ResponseEntity<NodoService.NodoResponse> setCapacidad(
            @PathVariable String iata,
            @RequestBody NodoService.CapacidadRequest req) {
        return ResponseEntity.ok(nodoService.actualizarCapacidad(iata, req.capacidad()));
    }

    @DeleteMapping("/{iata}/capacidad")
    public ResponseEntity<NodoService.NodoResponse> restaurarCapacidad(@PathVariable String iata) {
        return ResponseEntity.ok(nodoService.restaurarCapacidad(iata));
    }
}
```

**Tests nuevos** (4 archivos):

- `OperacionCapacidadControllerTest` (mockMvc + `@MockBean NodoService`): POST 200 OK + 400 (cap=0) + 404 (iata inexistente) + DELETE 200.
- `OperacionPreparacionPlanesTest` (unit): mock `nodoRepository.findByCodigoIata(...)` → verifica que `cargarPlanes` **NO** llama `nodoRepository.save(n)` ni `findByCodigoIata` (verificación explícita). Mock `parseAndSavePlanes` indirecto vía input file válido.
- `OperacionNodoCapacidadTest` (unit): mock `nodoRepository` → actualizarCapacidad happy path + `IllegalArgumentException` cuando capacidad fuera de rango + `NodoNoEncontradoException` cuando no existe la iata.
- `OperacionPreparacionLazyPlanVuelosTest` (unit): refuerza que el constructor de `OperacionPreparacionService` no lanza aunque `planVuelosRepository` esté vacío (gracias al fix lazy anterior). Llama `cargarPlanes` con `planVuelosRepository.findFirstByOrderByVigenciaDesdeAsc() → emptyOptional()` → espera `IllegalStateException("No existe PlanVuelos base. Verificar seeds")`.

### Sin cambios (verificado)

- `frontend/middleware.ts`: no existe (verificado con glob `frontend/middleware*`).
- `frontend/next.config.ts`: `basePath: "/front"` no cambia. Las llamadas a `/back/api/...` siguen funcionando vía rewrite del reverse proxy (Caddy).
- `backend/backend/src/main/resources/application.properties`: `app.simulacion.ruta-archivos` y demás siguen iguales.
- `SecurityConfig`: sigue siendo `permitAll()`. Si el equipo quiere endurecer permisos, eso va en una iteración futura.
- Modo `simulacion` y modo `colapso`: cero impacto. Sólo se edita `mode === "operacion"` en `OperacionView`.

## Cómo probar (manual end-to-end)

1. Abrir el sistema como `operador@tasfb2b.com` / `operador123`.
2. Hacer clic en tab **Operación** de la Navbar.
3. Verificar que la primera pantalla es el grid 4-sede (no entra directo al mapa).
4. Click **SPIM**. Verificar transición a la vista de setup con header `SPIM · Lima (Perú) · GMT-5` y hora local actualizándose cada segundo.
5. Capacidad: input `999` → "Guardar capacidad" → toast OK. Backend: `nodos_logisticos.capacidad_almacen WHERE codigo_iata = 'SPIM' == 999`.
6. Subir un `planes.txt` válido con `hora_presentacion=11` → toast "Planes cargados: N" → `GET /back/api/operacion/preparacion/estado` muestra `planes_tag_count > 0`.
7. Subir un `envios.csv` válido → toast "Ingresados: N".
8. Botón "Siguiente → Ver mapa" → entra a `OperacionView` actual. Verificar que el mapa muestra los vuelos recién cargados (estado `PROGRAMADO`).
9. Click **Cambiar sede** desde algún dock del mapa → vuelve al picker.
10. Verificar que **/recepcion** ya NO existe (404 o redirect dependiendo del setup del router). Si alguien entra por deep-link, redirige a `/`.

## Cómo probar (automatizado)

- `./mvnw test` (en `backend/backend`) — 29 tests verdes (25 actuales + 4 nuevos).
- `npm run lint` (en `frontend/`) — 0 problems / 0 warnings nuevos.

## Notas de archiving

Esta PR es NO breaking: el endpoint legacy `/api/operacion/preparacion` y la página `/admin/prep` siguen idénticos. Archivar con `openspec archive operacion-wizard-picker-setup` después de merge.
