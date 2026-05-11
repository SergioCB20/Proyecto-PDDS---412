# Proposal: Fix Seed Plan Vuelos

## What

Corregir el error de DataSeeder que no encuentra plan_vuelos en BD porque V5__plan_vuelos.sql no tiene el INSERT y Flyway ya la marcó como aplicada.

## Why

La base de datos existente tiene la tabla plan_vuelos vacía. DataSeeder espera leer un registro que no existe.

## Goals

- Crear nueva migracion V11__plan_vuelos_seed.sql con el INSERT
- Modificar DataSeeder para crear plan_vuelos si no existe (fallback)

## Non-Goals

- No resetear la base de datos

## Risks

- Ninguno — migration limpia, DataSeeder con fallback