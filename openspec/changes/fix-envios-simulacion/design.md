## Context

Actualmente los datos de envíos en modo simulación no se cargan por dos problemas:

1. **`SesionService.obtenerEnviosPanelSesion()`** (Panel "Envíos de Maletas"): Usa `EquipajeRepository.findEnviosPanel()` que no filtra por `sesion_id`. Luego filtra en memoria con `.filter(e -> sesionId.equals(e.getPlanViaje().getSesionId()))`. Como el query solo trae 100 equipajes (sin sesionId), los de la sesión activa rara vez aparecen.

2. **`EquipajeService.obtenerEnviosPorNodoConClasificacion()`** (detalle de aeropuerto): Usa 4 queries que tampoco filtran por `sesion_id`. Además el frontend nunca pasa `sesionId` a `DetalleEnviosAeropuerto`.

## Goals / Non-Goals

**Goals:**
- Panel "Envíos de Maletas" carga equipajes de la sesión activa en modo simulación
- Detalle de aeropuerto (saliendo/llegando/maletas) carga datos de la sesión activa
- Modal de vuelo en simulación ya funciona (tiene queries correctas), se verifica que no esté roto

**Non-Goals:**
- No cambiar modo operación (en vivo) — las queries sin sesión siguen funcionando igual
- No refactorizar la estructura del `DetalleEnviosAeropuerto`, solo agregar soporte de sesión

## Decisions

- **Nuevas queries vs parámetro opcional**: Se agregan métodos nuevos con sufijo `BySesion` en `EquipajeRepository` en vez de modificar las queries existentes. Esto mantiene compatibilidad con modo operación y evita regresiones.
- **Frontend pasa `sesionId` como query param opcional**: El endpoint `GET /api/nodos/{iata}/envios?sesionId=...` lo usa si está presente, sino funciona como antes.
- **`obtenerEnviosPorNodoConClasificacion` acepta `UUID sesionId` nullable**: Si es null, usa queries sin filtro (modo operación). Si no es null, usa las nuevas queries `BySesion`.
- **ModalEnvios ya tiene sesionId desde el padre**: Solo se verifica que `sesionId` se pase correctamente en SimulacionView y ColapsoView.

## Riesgos / Trade-offs

- **[Riesgo] Duplicación de queries**: 4 queries nuevas se suman a las 4 existentes. → Mantenible porque el cambio es explícito y no rompe el flujo actual.
- **[Riesgo] SesionId llega undefined en ciertos flujos**: → Se usa `@RequestParam(required=false)` y el servicio maneja null.
- **[Riesgo] Lazy loading de PlanViaje en las nuevas queries**: → Las nuevas queries incluyen `JOIN FETCH pv.planViaje` o acceden via JOIN directo.
