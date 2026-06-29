## 1. Backend — DTO y lógica de consulta

- [x] 1.1 Agregar inner record `EnvioPanelResponse` en `EquipajeService.java`
- [x] 1.2 Agregar nuevo método `obtenerEnviosPanel(tipo, origenIata, destinoIata)` en `EquipajeService.java`

## 2. Backend — Query en repositorio

- [x] 2.1 Agregar método de consulta en `EquipajeRepository.java` que filtre por estados, origenIata opcional y destinoIata opcional

## 3. Backend — Endpoint de operación

- [x] 3.1 Agregar endpoint `GET /api/equipajes/envios-panel` en `EquipajeController.java`

## 4. Backend — Endpoint de simulación

- [x] 4.1 Agregar método `obtenerEnviosPanelSesion(sesionId, tipo, origenIata, destinoIata)` en `SesionService.java`
- [x] 4.2 Agregar endpoint `GET /api/sesiones/{id}/envios/envios-panel` en `SesionController.java`

## 5. Frontend — Tipos y API

- [x] 5.1 Agregar interface `EnvioPanelResponse` en `types.ts`
- [x] 5.2 Agregar funciones `fetchEnviosPanel` y `fetchEnviosPanelSesion` en `api.ts`

## 6. Frontend — Componente PanelEnviosMaletas

- [x] 6.1 Crear componente `PanelEnviosMaletas.tsx` con 3 tabs, filtros y polling

## 7. Frontend — Integración en página

- [x] 7.1 Integrar `PanelEnviosMaletas` en `OperacionView`, `SimulacionView` y `ColapsoView` en `page.tsx`
