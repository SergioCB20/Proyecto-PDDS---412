# Plan: Mostrar vuelos en el mapa de operación

## Problema

El módulo de operación no muestra vuelos EN_RUTA ni COMPLETADO en el mapa interactivo debido a 4 causas acumuladas:

1. **Backend clona instancias para HOY, frontend busca en Jan 15** — `OperacionTickService` clona plantillas con `today = OffsetDateTime.now()`, pero el frontend consulta vuelos con fecha `2026-01-15`. Las instancias creadas (con fecha de hoy) no aparecen en la consulta inicial.

2. **Mismo-tick completion** — `procesarSalidas(now)` y `procesarLlegadas(now)` se ejecutan en el mismo tick. Si `hora_llegada <= now`, el vuelo pasa PROGRAMADO → EN_RUTA → COMPLETADO en una línea de código, sin que el WebSocket alcance a emitir el estado EN_RUTA.

3. **COMPLETADO no se emite vía WebSocket** — `OperacionTelemetriaService` solo consulta `[PROGRAMADO, EN_RUTA]`, excluyendo COMPLETADO.

4. **COMPLETADO no se renderiza en el mapa** — `GeoMapaVuelo.tsx` solo dibuja Polyline para EN_RUTA; COMPLETADO no produce salida visual.

## Solución

### 1. OperacionTickService.java — Fecha fija + fase alternada

```java
// Constante de fecha de operación
private static final LocalDate FECHA_OPERACION = LocalDate.of(2026, 1, 15);

// Flag de fase alternada
private volatile boolean procesarLlegadas = false;
```

**Reset (antes):**
```java
LocalDate today = OffsetDateTime.now(ZoneOffset.UTC).toLocalDate();
if (vueloService.existenInstanciasParaFecha(today)) {
    vueloService.resetearInstanciasPorFecha(today);
}
```
**Reset (después):**
```java
if (vueloService.existenInstanciasParaFecha(FECHA_OPERACION)) {
    vueloService.resetearInstanciasPorFecha(FECHA_OPERACION);
}
```

**Clonado (antes):**
```java
LocalDate today = OffsetDateTime.now(ZoneOffset.UTC).toLocalDate();
if (!today.equals(diaProcesado)) {
    if (vueloService.existenInstanciasParaFecha(today)) {
        vueloService.resetearInstanciasPorFecha(today);
    } else {
        int clonadas = vueloService.clonarPlantillas(today);
    }
    diaProcesado = today;
}
```
**Clonado (después):**
```java
if (!FECHA_OPERACION.equals(diaProcesado)) {
    if (vueloService.existenInstanciasParaFecha(FECHA_OPERACION)) {
        vueloService.resetearInstanciasPorFecha(FECHA_OPERACION);
    } else {
        int clonadas = vueloService.clonarPlantillas(FECHA_OPERACION);
    }
    diaProcesado = FECHA_OPERACION;
}
```

**Reloj virtual + fase alternada (antes):**
```java
OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
procesarSalidas(now);
procesarLlegadas(now);
```
**Reloj virtual + fase alternada (después):**
```java
OffsetDateTime now = OffsetDateTime.of(
    FECHA_OPERACION, OffsetDateTime.now(ZoneOffset.UTC).toLocalTime(), ZoneOffset.UTC);
procesarSalidas(now);
procesarLlegadas = !procesarLlegadas;
if (procesarLlegadas) {
    procesarLlegadas(now);
}
```

**Import adicional necesario:**
```java
import java.time.LocalDate;  // ya existe
```

### 2. OperacionTelemetriaService.java — COMPLETADO en telemetría

```java
// Agregar constante de fecha
private static final LocalDate FECHA_OPERACION = LocalDate.of(2026, 1, 15);
```

**Cambiar consulta (antes):**
```java
LocalDate hoy = OffsetDateTime.now(ZoneOffset.UTC).toLocalDate();
List<Vuelo> vuelos = vueloRepository.findByEstadoInAndEsPlantillaAndFechaOperacion(
    List.of(EstadoVuelo.PROGRAMADO, EstadoVuelo.EN_RUTA), false, hoy);
```
**Cambiar consulta (después):**
```java
LocalDate hoy = FECHA_OPERACION;
List<Vuelo> vuelos = vueloRepository.findByEstadoInAndEsPlantillaAndFechaOperacion(
    List.of(EstadoVuelo.PROGRAMADO, EstadoVuelo.EN_RUTA, EstadoVuelo.COMPLETADO), false, hoy);
```

**Nota:** `calcularProgreso` usa `now = OffsetDateTime.now()` (line 66 en `buildTelemetryJson`) que sigue siendo la hora real. Esto es correcto para calcular progreso de COMPLETADO (dará 1.0) y EN_RUTA (dará la fracción correspondiente). No requiere cambio.

### 3. GeoMapaVuelo.tsx — Renderizar COMPLETADO

**Cambiar Polyline (antes):**
```tsx
{vuelo.estado === 'EN_RUTA' && tieneRuta && (
  <Polyline ... />
)}
```

**Polyline (después):**
```tsx
{(vuelo.estado === 'EN_RUTA' || vuelo.estado === 'COMPLETADO') && tieneRuta && (
  <Polyline
    positions={puntosCurva}
    pathOptions={{
      color,
      weight: vuelo.estado === 'EN_RUTA' ? 2 : 1.5,
      opacity: vuelo.estado === 'EN_RUTA' ? opacidadRuta : 0.3,
      dashArray: vuelo.estado === 'COMPLETADO' ? '6, 4' : undefined,
    }}
  >
    <Tooltip>...</Tooltip>
  </Polyline>
)}
```

Esto dibuja:
- EN_RUTA: línea sólida (weight 2, opacidad normal) — igual que antes
- COMPLETADO: línea punteada gris (weight 1.5, opacidad 0.3, dashArray "6, 4")

### 4. Build y deploy

```bash
docker compose up -d --build
```

## Archivos a modificar

| Archivo | Ruta |
|---|---|
| OperacionTickService.java | `backend/backend/src/main/java/com/tasfb2b/backend/bc1/application/OperacionTickService.java` |
| OperacionTelemetriaService.java | `backend/backend/src/main/java/com/tasfb2b/backend/bc1/application/OperacionTelemetriaService.java` |
| GeoMapaVuelo.tsx | `frontend/components/mapa/GeoMapaVuelo.tsx` |
