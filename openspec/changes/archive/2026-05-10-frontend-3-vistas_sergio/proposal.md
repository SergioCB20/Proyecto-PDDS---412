# Proposal: Frontend TAS FB2B — 3 Vistas + Login

## What

Frontend Next.js 16 para el sistema TAS FB2B con 3 vistas principales (Administración, Simulación, Operación) más pantalla de Login, diseñado para probar el backend implementado en las Fases 1-3.

## Why

El equipo necesita un frontend funcional para validar el backend de forma visual. Las 3 vistas cubren todos los roles del sistema (ADMINISTRADOR, OPERADOR_LOGISTICO, ANALISTA) con prototipos como referencia.

## Goals

- Autenticación con redirect por rol
- CRUD de usuarios (ADMIN)
- Mapa geoespacial con nodos (aeropuertos) y vuelos en movimiento
- Vista operativa con datos en tiempo real (lectura)
- Preparado para integracion futura con Redis

## Non-Goals

- Backend BC2 (sesiones de simulacion) — se implementa despues
- Formulario de registro de equipaje en operacion
- Reporte final con grafico SLA
- WebSocket de telemetria

## Risks

- Mapa geoespacial requiere instalacion de leaflet (SSR de Next.js)
- Sin backend BC2, simulacion usa datos mock
- Preparacion para Redis sin implementacion real aun