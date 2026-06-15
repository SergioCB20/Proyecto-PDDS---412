## 1. DTOs

- [ ] 1.1 Crear `EnvioItemResponse` record (origen_iata, destino_iata, codigo_equipaje, cantidad)
- [ ] 1.2 Crear `EnvioEntregadoResponse` record (origen_iata, destino_iata, codigo_vuelo, cantidad)

## 2. Queries en repositorios

- [ ] 2.1 Agregar `@Query` en `EquipajeRepository` para B2: findByVueloActualIdAndSesionId
- [ ] 2.2 Agregar `@Query` en `EquipajeRepository` para B3: findBySesionIdAndEstadoAndNodoIata
- [ ] 2.3 Agregar `@Query` en `PlanViajeRepository` para B4: findEntregadosRecientes con subquery y ventana temporal

## 3. Servicio

- [ ] 3.1 Agregar método `obtenerEnviosVuelo(UUID sesionId, UUID vueloId)` en `SesionService`
- [ ] 3.2 Agregar método `obtenerEnviosNodo(UUID sesionId, String nodoIata)` en `SesionService`
- [ ] 3.3 Agregar método `obtenerEntregadosRecientes(UUID sesionId, int horas)` en `SesionService`

## 4. Controlador

- [ ] 4.1 Agregar endpoint `GET /{id}/envios/vuelo/{vueloId}` en `SesionController`
- [ ] 4.2 Agregar endpoint `GET /{id}/envios/nodo/{nodoIata}` en `SesionController`
- [ ] 4.3 Agregar endpoint `GET /{id}/envios/entregados-recientes` en `SesionController`

## 5. Verificación

- [ ] 5.1 Compilar backend y verificar que no hay errores
