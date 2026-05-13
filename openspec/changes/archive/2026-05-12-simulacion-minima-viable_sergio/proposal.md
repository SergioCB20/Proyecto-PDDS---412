# Proposal: Simulación con Datos Reales — TAS FB2B

## What

Implementar el camino mínimo viable para que la simulación funcione con datos reales: migraciones BC2, entidades de sesión, SesionService+Controller, y conectar el frontend.

## Why

El proyecto actualmente tiene la UI de simulación pero sin conexión al backend. Necesitamos que el analista pueda crear, iniciar y monitorear sesiones reales.

## Goals

- Crear migraciones SQL para tablas BC2 (V11-V16)
- Crear entidades: SesionEjecucion, EventoCancelacion, LoteReplanificacion
- Implementar SesionService con CRUD básico de sesiones
- Implementar SesionController: POST /sesiones, /iniciar, /pausar, /detener, /metricas
- Conectar frontend /simulacion/[id] a API real

## Non-Goals

- MotorEnrutamiento (puede devolver rutas dummy)
- TickService con scheduler real (metrics hardcoded)
- ReplanificacionService
- WebSocket