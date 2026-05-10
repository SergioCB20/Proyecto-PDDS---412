# Proposal: Backend Fases 1-3 — TAS FB2B

## What

Implementacion del backend del sistema TAS FB2B cubriendo las fases 1, 2 y 3 del plan de implementacion:

- **Fase 1 (BC3 - Identidad y Acceso):** Autenticacion JWT, CRUD de usuarios, auditoria
- **Fase 2 (BC1 minimo - Consulta):** Entidades Nodo/Vuelo, endpoints GET /nodos y /vuelos
- **Fase 3 (BC1 - Gestion Operativa):** Registro de equipaje, consulta de plan de viaje, cancelacion de vuelos

## Why

El frontend necesita un backend funcional para probar la interfaz. Estas 3 fases cubren el flujo basico de operacion logistica de equipaje area.

## Goals

- Autenticacion JWT con 3 roles (ADMINISTRADOR, OPERADOR_LOGISTICO, ANALISTA)
- Consulta de red logistica (nodos y vuelos)
- Registro de equipaje con validaciones de capacidad
- Cancelacion de vuelos con deteccion de equipajes afectados

## Non-Goals

- Sesiones de simulacion (Fase 4)
- WebSocket de telemetria
- Carga masiva CSV

## Risks

- Dependencia de PostgreSQL y Redis corriendo localmente
- Seed de datos en codigo Java (requiere rearranque para re-seed)