### BC1 — Gestión Operativa

#### `nodos_logisticos`
```sql
CREATE TABLE nodos_logisticos (
    id                UUID PRIMARY KEY,
    codigo_iata       VARCHAR(10)  NOT NULL UNIQUE,
    nombre            VARCHAR(255) NOT NULL,
    latitud           DECIMAL(9,6) NOT NULL,
    longitud          DECIMAL(9,6) NOT NULL,
    capacidad_almacen INT          NOT NULL,
    ocupacion_actual  INT          NOT NULL DEFAULT 0,
    continente        VARCHAR(20)            -- AMERICA_DEL_SUR | EUROPA | ASIA
);
```
> `continente` es nullable para permitir la migración de datos existentes. El seeder `NodoVueloSeeder.poblarContinentes()` lo completa automáticamente al iniciar. Todos los nodos seed actuales tienen continente asignado.
