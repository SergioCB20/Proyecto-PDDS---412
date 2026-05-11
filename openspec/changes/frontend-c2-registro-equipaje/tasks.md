## 1. Tipos y utilidades

- [x] 1.1 Agregar tipo `CrearEquipajeRequest` en `frontend/lib/types.ts`
- [x] 1.2 Agregar tipo `PlanViajeResponse` en `frontend/lib/types.ts` (ya existe, verificar)
- [x] 1.3 Agregar mock data de destinos IATA en `frontend/lib/mock.ts` (ya existe en MOCK_NODOS)

## 2. Formulario de registro en /operacion

- [x] 2.1 Crear estado local para campos del formulario: `idEquipaje`, `destinoIata`, `vueloId`, `slaComprometido`
- [x] 2.2 Agregar sección colapsable "Registrar Equipaje" en el sidebar de `/operacion`
- [x] 2.3 Implementar campo `id_equipaje` con Input component
- [x] 2.4 Implementar campo `destino_iata` con select poblada desde nodos
- [x] 2.5 Implementar campo `vuelo_id` con select poblada desde `GET /vuelos?estado=PROGRAMADO`
- [x] 2.6 Implementar campo `sla_comprometido` como input numérico (horas)
- [x] 2.7 Agregar botón "Registrar" que envía POST a `/api/equipajes`
- [x] 2.8 Manejar estados de loading, éxito y error del formulario
- [x] 2.9 Mostrar respuesta del servidor (plan de viaje) debajo del formulario

## 3. Fallback y polish

- [x] 3.1 Implementar fallback a `MOCK_VUELOS` si la API de vuelos falla
- [x] 3.2 Agregar validación de campos obligatorios antes de enviar
- [x] 3.3 Marcar C2 como completada en `TAREAS_FRONTEND.md`