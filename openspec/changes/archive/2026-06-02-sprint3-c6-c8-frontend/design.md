## Context

El proyecto tiene un archivo `frontend/proxy.ts` que implementa la lógica de protección de rutas por rol (ADMINISTRADOR, OPERADOR_LOGISTICO, ANALISTA), pero Next.js solo reconoce `middleware.ts` como middleware estándar. Esto significa que la protección nunca se ejecuta realmente.

Por otro lado, `operacion/page.tsx` pasa datos de tipo `Vuelo[]` al componente `GeoMapa`, que espera `VueloEnMapa[]`. Aunque estructuralmente son compatibles (los campos extras de `VueloEnMapa` son opcionales), el tipo correcto debe usarse para compilación limpia y futura extensibilidad.

## Goals / Non-Goals

**Goals:**
- Implementar middleware de Next.js funcional con protección por rol
- Eliminar el archivo `proxy.ts` que no es reconocido como middleware
- Corregir el tipo de dato que recibe `GeoMapa` en la página de operación

**Non-Goals:**
- No se modifica la lógica de roles ni las rutas permitidas
- No se añaden nuevas funcionalidades de seguridad (solo se implementa lo ya definido)
- No se modifica el mapa ni sus componentes hijos

## Decisions

### 1. Nombrar el middleware como `middleware.ts` (no `proxy.ts`)
Next.js requiere que el middleware esté en `middleware.ts` en la raíz del proyecto frontend. El archivo `proxy.ts` exporta una función `proxy()` con la firma y config correctas, pero Next.js no lo ejecuta porque el nombre no coincide.

### 2. Migrar la lógica de proxy.ts a middleware.ts sin cambios
La lógica actual de `proxy.ts` es correcta: decodifica el JWT desde la cookie, valida el rol, y redirige si no tiene acceso. Se copia a `middleware.ts` y se elimina `proxy.ts`.

### 3. Mapeo simple de Vuelo a VueloEnMapa
En `fetchData()` de `operacion/page.tsx`, al actualizar `allVuelos`, se mapea cada elemento con spread operator `{...v}`. Esto satisface el tipo `VueloEnMapa` ya que ambos campos extras son opcionales.

## Risks / Trade-offs

- **Riesgo**: Si alguien importa `proxy.ts` desde otro archivo → se romperá al eliminar el archivo → mitigación: buscar referencias a `proxy.ts` antes de eliminarlo
- **Riesgo**: El middleware usa `atob()` que puede no estar disponible en edge runtime de Next.js → mitigación: Next.js edge runtime soporta `atob` de forma nativa
