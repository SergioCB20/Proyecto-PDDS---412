## Context

El frontend de TasFB2B usa el término "Nodo" en toda la interfaz para referirse a los aeropuertos. Este término es técnico y poco intuitivo para usuarios del sistema. El rename abarca 16 archivos del frontend (operación y simulación) con 3 niveles de cambio: textos visibles, tipos/variables, y nombres de archivos.

El backend NO se modifica: entidades Java (`NodoLogistico`), endpoints REST (`/api/nodos`), headers (`X-Device-Nodo-Id`), JSON keys (`"nodos"`), y tablas DB (`nodos_logisticos`) permanecen igual.

## Goals / Non-Goals

**Goals:**
- Renombrar todos los textos visibles al usuario de "Nodo/s" a "Aeropuerto/s"
- Renombrar tipos TypeScript, interfaces, variables y funciones del frontend
- Renombrar componentes React y archivos físicos
- Mantener compatibilidad total con el backend (JSON keys, URLs, headers)

**Non-Goals:**
- NO cambiar el backend (entidades, endpoints, JSON, DB)
- NO migrar la base de datos
- NO cambiar el comportamiento de ningún módulo

## Decisions

### 1. Tipo literal `'nodo'` se mantiene igual
**Decisión:** El discriminador `tipo: 'vuelo' | 'nodo'` en `SelectedEnvioOperacion` y `SelectedEnvio` NO se renombra porque es un valor que coincide con el enum `UbicacionTipo.NODO` del backend y se usa internamente como identificador, no como texto visible.

### 2. JSON keys del backend no se tocan
**Decisión:** Aunque los tipos se renombren (`Nodo` → `Aeropuerto`, `NodoTelemetria` → `AeropuertoTelemetria`), las propiedades que mapean directamente a JSON keys del backend (como `codigo_iata`, `capacidad_almacen`, `ocupacion_actual`, `nodo_ref_id`, `nodo_origen`, `nodo_destino`) conservan sus nombres originales. Solo se renombran los nombres de los tipos/interfaces que las envuelven.

### 3. URLs de API no se modifican
**Decisión:** Los endpoints `/api/nodos`, `/api/sesiones/{id}/envios/nodo/{nodoIata}`, y el header `X-Device-Nodo-Id` se mantienen. Solo se renombran las funciones del frontend que los llaman (`fetchEnviosNodo` → `fetchEnviosAeropuerto`).

### 4. Orden de ejecución: bottom-up
**Decisión:** Se modifica primero los archivos base (`types.ts`, `colors.ts`, `mock.ts`, `device.ts`, `api.ts`), luego los componentes hoja (`GeoMapaNodo.tsx`, `PanelNodos*.tsx`), y por último los que importan todo (`page.tsx`). Esto minimiza errores de compilación durante el proceso.

## Risks / Trade-offs

- **Riesgo: import paths rotos** → Mitigación: usar `git mv` para renombrar archivos (preserva git history) y actualizar todos los imports simultáneamente.
- **Riesgo: olvidar alguna referencia** → Mitigación: después de todos los cambios, ejecutar `npm run build` y verificar que no haya errores de TypeScript.
- **Riesgo: confusión entre nombre de variable y JSON key** → Mitigación: documentar que las props que vienen del backend (`nodo_ref_id`, `nodo_origen`, etc.) se mantienen con su nombre original aunque el tipo se llame `Aeropuerto`.
