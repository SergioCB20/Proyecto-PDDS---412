## ADDED Requirements

### Requirement: Timeout en cliente HTTP
El cliente HTTP (`lib/api.ts`) SHALL tener un timeout configurado de 15 segundos para todas las peticiones REST. Si el servidor no responde en ese plazo, la petición SHALL ser abortada y el error propagado al caller.

#### Scenario: Timeout superado en GET
- **WHEN** una petición GET demora más de 15 segundos en responder
- **THEN** el fetch SHALL ser abortado y la promesa rechazada con un `AbortError`

#### Scenario: Timeout superado en POST
- **WHEN** una petición POST demora más de 15 segundos en responder
- **THEN** el fetch SHALL ser abortado y la promesa rechazada con un `AbortError`

#### Scenario: Timeout aplica a upload y downloadBlob
- **WHEN** se usa `api.upload()` o `api.downloadBlob()`
- **THEN** ambos métodos SHALL respetar el timeout de 15 segundos

### Requirement: Suspense boundary en página de reporte
La página `app/simulacion/[id]/reporte/page.tsx` SHALL estar envuelta en un `<Suspense>` boundary de React para permitir la resolución asíncrona de `useParams()` en Next.js 16.

#### Scenario: Carga de reporte con Suspense
- **WHEN** un usuario navega a `/simulacion/{id}/reporte`
- **THEN** el componente SHALL mostrar un fallback de carga mientras `useParams()` resuelve
- **THEN** el componente SHALL renderizar el contenido completo del reporte una vez resuelto
