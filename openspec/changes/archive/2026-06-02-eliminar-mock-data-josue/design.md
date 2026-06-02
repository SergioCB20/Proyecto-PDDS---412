## Context

La página de operación (`frontend/app/operacion/page.tsx`) es el principal punto de interacción para que un `OPERADOR_LOGISTICO` registre equipajes, cree vuelos y monitoree el estado de nodos. Históricamente, el desarrollo usó datos mock para agilizar la interfaz sin depender del backend, pero estos datos quedaron como estado inicial y como fallback de errores.

La presencia de mock data causa un problema sutil pero crítico: los IDs de nodos y vuelos en `MOCK_NODOS` y `MOCK_VUELOS` no existen en la base de datos PostgreSQL. Cuando el usuario completa un formulario (ej. "Nuevo Vuelo" con `origen_id` de un nodo mock), el backend responde con `422 Unprocessable Entity` — "Origen no encontrado". Pero como `fetchData()` tiene `.catch(() => MOCK_NODOS)`, el error de conexión inicial también se oculta, y el usuario ve datos mock en la interfaz sin saber que el backend está desconectado o que su token no tiene permisos.

Además, el tipo `CrearEquipajeResponse` en `frontend/lib/types.ts` declara un campo `plan_viaje: PlanViajeResponse` que el backend nunca retorna en `POST /equipajes`. `EquipajeService.registrar()` devuelve `EquipajeRegistradoResponse` con solo `{ id, estado, id_externo, destino_iata }`. Al intentar renderizar `formSuccess.plan_viaje.estado_sla` (línea 598), el frontend lanza `TypeError: Cannot read properties of undefined`, crasheando el mensaje de éxito.

Adicionalmente, `VueloService.crear()` tiene un bug que impide crear vuelos exitosamente: nunca asigna el campo `planVuelos` (FK `plan_vuelos_id` con `nullable = false`) ni las coordenadas (`origenLat`, `origenLon`, `destinoLat`, `destinoLon`, también NOT NULL). Hibernate lanza `DataIntegrityViolationException`, que al no tener handler específico en `GlobalExceptionHandler`, cae en el catch-all y retorna "Error interno del servidor" (500).

## Goals / Non-Goals

**Goals:**
- Que los formularios de creación de vuelo y equipaje funcionen con datos reales del backend
- Que los errores de conexión y permisos sean visibles para el usuario
- Que el mensaje de éxito al crear equipaje no crashee
- Eliminar toda dependencia de `MOCK_NODOS` y `MOCK_VUELOS` en la página de operación
- Corregir el error 500 en `VueloService.crear()` por campos obligatorios no asignados

**Non-Goals:**
- No se aborda el problema de movimiento de aviones en simulación (requiere WebSocket, es un cambio separado)
- No se elimina la función utilitaria `nodoToEnMapa` de `mock.ts` (no es dato mock, es transformación)

## Decisions

| Decisión | Opción elegida | Alternativa descartada |
|---|---|---|---|
| **Estado inicial de nodos** | `[]` — arreglo vacío | Mantener mock data inicial (descartado porque el usuario ve datos falsos al cargar la página) |
| **Manejo de error en fetchData** | Propagar error y mostrar banner rojo | `.catch(() => MOCK_NODOS)` (descartado porque oculta problemas de conexión) |
| **Respuesta de creación de equipaje** | Simplificar `CrearEquipajeResponse` sin `plan_viaje` | Modificar backend para retornar `EquipajeResponse` completo (descartado porque requiere cambios en Java, mayor riesgo y tiempo) |
| **Campos faltantes en crear vuelo** | Asignar `planVuelos` activo y coordenadas en `VueloService.crear()` | Dejar que el controller maneje `DataIntegrityViolationException` (descartado porque el error real está en el service, no en el controller) |
| **Selects sin datos** | `disabled` + placeholder dinámico cuando `nodos.length === 0` | Dejar el select habilitado sin opciones (descartado porque confunde al usuario) |
| **URL de API** | `.env.local` con `NEXT_PUBLIC_API_URL=http://localhost:8080/api` | Fallback a `localhost:8080` en código (descartado porque es menos explícito) |

## Risks / Trade-offs

- **[Riesgo bajo] Página en blanco al cargar**: Al iniciar con arrays vacíos, la página mostrará selects sin opciones hasta que `fetchData()` complete. Ya hay polling cada 5s que carga los datos automáticamente. Los selects ahora se muestran como `disabled` mientras no hay datos.
- **[Riesgo medio] Error visible al usuario**: Si el backend no está corriendo, el banner rojo de error aparecerá permanentemente. Esto es intencional — es preferible a que el usuario crea que todo funciona cuando no es así.
- **[Riesgo medio] PlanVuelos sin seed**: Si no hay `PlanVuelos` en la BD (el `DataSeeder` lo crea), `crear()` lanzará "No hay plan de vuelos activo" (422). El usuario debe asegurarse de que el seed se ejecute.
- **[Trade-off] Sin plan de viaje en éxito**: El mensaje de éxito al crear equipaje ya no muestra el plan de viaje (segmentos, SLA). Se podría agregar después llamando a `GET /equipajes/{id}/plan-viaje`.
