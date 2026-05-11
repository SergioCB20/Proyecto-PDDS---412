# Design: Fix Seed Plan Vuelos

## Solucion

1. Crear V11__plan_vuelos_seed.sql con el INSERT
2. Modificar DataSeeder para crear plan_vuelos si no existe

## Migration V11__plan_vuelos_seed.sql

```sql
INSERT INTO plan_vuelos (id, descripcion, vigencia_desde, vigencia_hasta) VALUES
('00000000-0000-0000-0002-000000000001', 'Plan operativo inicial', '2025-06-01T00:00:00Z', '2025-12-31T23:59:59Z')
ON CONFLICT (id) DO NOTHING;
```

## DataSeeder fallback

```java
PlanVuelos planVuelos = planVuelosRepository.findById(PLAN_VUELOS_ID)
    .orElseGet(() -> planVuelosRepository.save(new PlanVuelos(
        PLAN_VUELOS_ID, "Plan operativo inicial",
        vigenciaDesde, vigenciaHasta
    )));
```