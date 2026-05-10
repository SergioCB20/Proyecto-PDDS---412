# Tasks: Backend Fases 1-3

## Fase 1: BC3 - Identidad y Acceso

- [x] Configurar dependencias (jjwt, flyway, spring-dotenv, validation)
- [x] Crear migraciones Flyway (V1-V4)
- [x] Implementar entidades (Usuario, Rol, EntradaAuditoria)
- [x] Implementar JwtUtil, JwtFilter, SecurityConfig
- [x] Implementar AuthController + AuthService
- [x] Implementar UsuarioController + UsuarioService
- [x] Implementar DataSeeder (roles y usuarios)
- [x] Probar login y proteccion de endpoints

## Fase 2: BC1 minimo - Consulta

- [x] Crear migraciones (V5-V7: plan_vuelos, nodos, vuelos)
- [x] Implementar entidades (PlanVuelos, NodoLogistico, Vuelo)
- [x] Implementar repositorios
- [x] Implementar NodoService + NodoController
- [x] Implementar VueloService + VueloController
- [x] Agregar seed de 5 nodos y 10 vuelos
- [x] Probar GET /nodos y GET /vuelos

## Fase 3: BC1 - Gestion Operativa

- [x] Crear migraciones (V8-V10: planes_viaje, equipajes, segmentos)
- [x] Implementar entidades (Equipaje, PlanViaje, SegmentoPlan)
- [x] Implementar repositorios
- [x] Implementar EquipajeService + EquipajeController
- [x] Implementar GET /equipajes/{id}/plan-viaje
- [x] Implementar CancelacionService + CancelacionController
- [x] Implementar validaciones (capacidad nodo, vuelo activo)
- [x] Probar registro de equipaje y cancelacion

## Resumen

- Total tareas: 22
- Completadas: 22
- Pendientes: 0