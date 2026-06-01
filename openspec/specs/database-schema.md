# database-schema.md
> **Spec owner:** PM/Lead  
> **Estado:** Draft v1  
> **Última actualización:** 10/05/2026  
> **Consumidores:** Backend devs — usa este spec para crear las migraciones

---

## Convenciones

| Convención | Detalle |
|---|---|
| Tipo de ID | `UUID` generado en la capa de aplicación (no en la BD) |
| Timestamps | `TIMESTAMPTZ` (con zona horaria) para todo datetime |
| Strings cortos | `VARCHAR(255)` salvo indicación contraria |
| Enums | Se almacenan como `VARCHAR(50)` con CHECK constraint |
| Soft delete | No se elimina físicamente ningún registro — se usa campo `estado` |
| Migraciones | Flyway — un archivo por tabla, prefijo `V{n}__nombre_tabla.sql` |

---

## PostgreSQL — Tablas

### BC3 — Identidad y Acceso

#### `roles`
```sql
CREATE TABLE roles (
    id          UUID PRIMARY KEY,
    nombre      VARCHAR(50)  NOT NULL UNIQUE,
    permisos    TEXT         NOT NULL  -- JSON serializado con lista de permisos
);
```
**Valores iniciales (seed):** `ADMINISTRADOR`, `OPERADOR_LOGISTICO`, `ANALISTA`

---

#### `usuarios`
```sql
CREATE TABLE usuarios (
    id              UUID PRIMARY KEY,
    rol_id          UUID         NOT NULL REFERENCES roles(id),
    nombre          VARCHAR(255) NOT NULL,
    correo          VARCHAR(255) NOT NULL UNIQUE,
    estado          VARCHAR(50)  NOT NULL DEFAULT 'ACTIVO',
                                 -- CHECK: ACTIVO | INACTIVO
    hash_password   VARCHAR(255) NOT NULL,
    ultimo_acceso   TIMESTAMPTZ,
    intentos_fallidos INT        NOT NULL DEFAULT 0,
    nodo_ref_id     UUID,        -- Referencia lógica a nodos_logisticos.id (sin FK cross-BC)
    asignado_en     TIMESTAMPTZ
);
```

---

#### `entradas_auditoria`
```sql
CREATE TABLE entradas_auditoria (
    id               UUID PRIMARY KEY,
    usuario_id       UUID         NOT NULL REFERENCES usuarios(id),
    accion           VARCHAR(255) NOT NULL,
    entidad_afectada VARCHAR(255) NOT NULL,
    ocurrido_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```
> Esta tabla es **inmutable** — no se permiten UPDATE ni DELETE sobre ella.

---

### BC1 — Gestión Operativa

#### `plan_vuelos`
```sql
CREATE TABLE plan_vuelos (
    id              UUID PRIMARY KEY,
    descripcion     VARCHAR(255) NOT NULL,
    vigencia_desde  TIMESTAMPTZ  NOT NULL,
    vigencia_hasta  TIMESTAMPTZ  NOT NULL
);
```
**Seed inicial:** Un único registro que agrupa todos los vuelos precargados.

---

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
> El campo `continente` es nullable para permitir la migración de datos existentes. El `NodoVueloSeeder` lo completa automáticamente al iniciar para todos los nodos sin continente asignado.

---

#### `vuelos`
```sql
CREATE TABLE vuelos (
    id               UUID PRIMARY KEY,
    plan_vuelos_id   UUID         NOT NULL REFERENCES plan_vuelos(id),
    codigo_vuelo     VARCHAR(20)  NOT NULL,
    estado           VARCHAR(50)  NOT NULL DEFAULT 'PROGRAMADO',
                                  -- CHECK: PROGRAMADO | EN_RUTA | CANCELADO | COMPLETADO
    origen_id        UUID         NOT NULL REFERENCES nodos_logisticos(id),
    destino_id       UUID         NOT NULL REFERENCES nodos_logisticos(id),
    origen_lat       DECIMAL(9,6) NOT NULL,
    origen_lon       DECIMAL(9,6) NOT NULL,
    destino_lat      DECIMAL(9,6) NOT NULL,
    destino_lon      DECIMAL(9,6) NOT NULL,
    capacidad_carga  INT          NOT NULL,
    carga_disponible INT          NOT NULL,
    hora_salida      TIMESTAMPTZ  NOT NULL,
    hora_llegada     TIMESTAMPTZ  NOT NULL,
    es_plantilla     BOOLEAN      NOT NULL DEFAULT false
                                -- true: vuelo semilla (plantilla de 24 h)
                                -- false: vuelo generado por simulación
);
```

---

#### `equipajes`
```sql
CREATE TABLE equipajes (
    id               UUID PRIMARY KEY,
    plan_viaje_id    UUID         REFERENCES planes_viaje(id),
    vuelo_actual_id  UUID         REFERENCES vuelos(id),
    estado           VARCHAR(50)  NOT NULL DEFAULT 'REGISTRADO',
                                  -- CHECK: REGISTRADO | ENRUTADO | EN_REPLANIFICACION
                                  --        | EN_VUELO | EN_ALMACEN | ENTREGADO | INCUMPLIMIENTO_SLA
    fecha_ingreso    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    destino_iata     VARCHAR(10)  NOT NULL,
    sla_comprometido TIMESTAMPTZ  NOT NULL  -- Fecha/hora límite de entrega
);
```

---

#### `planes_viaje`
```sql
CREATE TABLE planes_viaje (
    id                  UUID PRIMARY KEY,
    equipaje_id         UUID         NOT NULL UNIQUE REFERENCES equipajes(id),
    estado_sla          VARCHAR(50)  NOT NULL DEFAULT 'EN_TIEMPO',
                                     -- CHECK: EN_TIEMPO | INCUMPLIMIENTO_SLA
    tiempo_entrega_est  TIMESTAMPTZ,
    ubicacion_tipo      VARCHAR(20),  -- CHECK: NODO | VUELO
    ubicacion_id        UUID,         -- ID del nodo o vuelo actual
    ubicacion_lat       DECIMAL(9,6),
    ubicacion_lon       DECIMAL(9,6)
);
```

---

#### `segmentos_plan`
```sql
CREATE TABLE segmentos_plan (
    id               UUID PRIMARY KEY,
    plan_viaje_id    UUID        NOT NULL REFERENCES planes_viaje(id),
    vuelo_id         UUID        NOT NULL REFERENCES vuelos(id),
    nodo_origen_id   UUID        NOT NULL REFERENCES nodos_logisticos(id),
    nodo_destino_id  UUID        NOT NULL REFERENCES nodos_logisticos(id),
    orden            INT         NOT NULL,
    hora_salida_prog TIMESTAMPTZ NOT NULL,
    estado           VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE'
                                 -- CHECK: PENDIENTE | EN_CURSO | COMPLETADO | CANCELADO
);
```

---

### BC2 — Planificación y Replanificación

#### `sesiones_ejecucion`
```sql
CREATE TABLE sesiones_ejecucion (
    id                    UUID PRIMARY KEY,
    tipo                  VARCHAR(20)   NOT NULL,
                                        -- CHECK: SIMULADA | EN_VIVO
    estado                VARCHAR(20)   NOT NULL DEFAULT 'CONFIGURADA',
                                        -- CHECK: CONFIGURADA | EN_CURSO | PAUSADA | FINALIZADA | COLAPSADA
    fecha_inicio_virtual  TIMESTAMPTZ   NOT NULL,
    hora_inicio_virtual   TIME          NOT NULL,
    fecha_inicio_real     TIMESTAMPTZ,
    fecha_fin_real        TIMESTAMPTZ,
    -- Umbrales almacén (Verde/Ámbar/Rojo)
    almacen_verde_min     DECIMAL(5,2)  NOT NULL DEFAULT 0,
    almacen_verde_max     DECIMAL(5,2)  NOT NULL DEFAULT 70,
    almacen_ambar_min     DECIMAL(5,2)  NOT NULL DEFAULT 70,
    almacen_ambar_max     DECIMAL(5,2)  NOT NULL DEFAULT 90,
    almacen_rojo_min      DECIMAL(5,2)  NOT NULL DEFAULT 90,
    almacen_rojo_max      DECIMAL(5,2)  NOT NULL DEFAULT 100,
    -- Umbrales vuelo (Verde/Ámbar/Rojo)
    vuelo_verde_min       DECIMAL(5,2)  NOT NULL DEFAULT 0,
    vuelo_verde_max       DECIMAL(5,2)  NOT NULL DEFAULT 70,
    vuelo_ambar_min       DECIMAL(5,2)  NOT NULL DEFAULT 70,
    vuelo_ambar_max       DECIMAL(5,2)  NOT NULL DEFAULT 90,
    vuelo_rojo_min        DECIMAL(5,2)  NOT NULL DEFAULT 90,
    vuelo_rojo_max        DECIMAL(5,2)  NOT NULL DEFAULT 100,
    -- Métricas en vivo (se actualizan en cada tick)
    dia_hora_virtual             TIMESTAMPTZ,
    segundos_reales_transcurridos INT   DEFAULT 0,
    sla_acumulado_pct            DECIMAL(5,2) DEFAULT 0,
    vuelos_cancelados            INT    DEFAULT 0,
    maletas_replanificadas       INT    DEFAULT 0,
    -- Solo para modo SIMULADA
    prob_cancelacion             DECIMAL(5,2) DEFAULT 0
);
```

---

#### `eventos_cancelacion`
```sql
CREATE TABLE eventos_cancelacion (
    id                UUID PRIMARY KEY,
    sesion_id         UUID         NOT NULL REFERENCES sesiones_ejecucion(id),
    vuelo_ref_id      UUID         NOT NULL,  -- Referencia lógica a vuelos.id
    fuente            VARCHAR(100) NOT NULL,  -- Ej: 'POSTMAN_SIM', 'MOTOR_SIMULACION'
    causa             VARCHAR(255),
    ocurrido_en_virtual TIMESTAMPTZ,
    ocurrido_en_real  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

#### `lotes_replanificacion`
```sql
CREATE TABLE lotes_replanificacion (
    id               UUID PRIMARY KEY,
    evento_id        UUID        NOT NULL REFERENCES eventos_cancelacion(id),
    sesion_id        UUID        NOT NULL REFERENCES sesiones_ejecucion(id),
    estado           VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
                                 -- CHECK: PENDIENTE | EN_PROCESO | COMPLETADO | FALLIDO
    total_equipajes  INT         NOT NULL DEFAULT 0,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

#### `items_lote`
```sql
CREATE TABLE items_lote (
    id                    UUID PRIMARY KEY,
    lote_id               UUID        NOT NULL REFERENCES lotes_replanificacion(id),
    equipaje_ref_id       UUID        NOT NULL,  -- Referencia lógica a equipajes.id
    estado_replanificacion VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE'
                                       -- CHECK: PENDIENTE | ENRUTADO | INCUMPLIMIENTO_SLA | FALLIDO
);
```

---

#### `reportes_sesion`
```sql
CREATE TABLE reportes_sesion (
    id                    UUID PRIMARY KEY,
    sesion_id             UUID          NOT NULL UNIQUE REFERENCES sesiones_ejecucion(id),
    sla_incumplido_pct    DECIMAL(5,2)  NOT NULL,
    total_replanificadas  INT           NOT NULL,
    punto_colapso_virtual TIMESTAMPTZ,   -- NULL si no hubo colapso
    nodo_colapso_ref_id   UUID,          -- Referencia lógica al nodo que colapsó
    causa_colapso         VARCHAR(255),
    generado_en           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

---

#### `puntos_sla`
```sql
CREATE TABLE puntos_sla (
    id                   UUID PRIMARY KEY,
    reporte_id           UUID          NOT NULL REFERENCES reportes_sesion(id),
    momento_virtual      TIMESTAMPTZ   NOT NULL,
    sla_pct              DECIMAL(5,2)  NOT NULL,
    hubo_cancelacion     BOOLEAN       NOT NULL DEFAULT FALSE,
    vuelo_cancelado_ref_id UUID         -- NULL si no hubo cancelación en este punto
);
```

---

#### `equipajes_simulados` (Staging)
```sql
CREATE TABLE equipajes_simulados (
    id UUID PRIMARY KEY,
    sesion_id UUID NOT NULL REFERENCES sesiones_ejecucion(id),
    id_externo VARCHAR(50) NOT NULL,
    origen_iata VARCHAR(10) NOT NULL,
    destino_iata VARCHAR(10) NOT NULL,
    vuelo_id UUID,
    sla_comprometido TIMESTAMPTZ NOT NULL,
    fecha_ingreso_virtual TIMESTAMPTZ NOT NULL,
    procesado BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_equipajes_sim_busqueda ON equipajes_simulados(sesion_id, fecha_ingreso_virtual, procesado);
```
> **Modelo de Carga de Simulación**: La tabla es alimentada al inicio de cada sesión simulada leyendo archivos CSV estáticos locales desde `classpath:data/`.
> - **Nombre del archivo:** Debe seguir el formato `_envios_{cod_aeropuerto}.csv` (ejemplo: `_envios_LIM.csv`). El código IATA de origen se deduce del nombre del archivo y se aplica a todas las filas.
> - **Formato del archivo:** ID_Externo, Destino_IATA, SLA_Comprometido, Fecha_Ingreso_Virtual, [Opcional] Vuelo_ID.
> 
> Un servicio inyector (feeder) extrae luego estos registros no procesados y los inyecta a la tabla principal `equipajes` basándose en el reloj virtual, marcándolos como procesados.

---

## Redis — Claves y estructura

| Clave | Tipo | Valor | TTL | Escrito por |
|---|---|---|---|---|
| `nodo:{id}:ocupacion` | String | `INT` — número de maletas actuales | Sin TTL | BC1 al confirmar ingreso / BC2 al replanificar |
| `vuelo:{id}:carga_disponible` | String | `INT` — espacios disponibles | Sin TTL | BC1 al confirmar ingreso / BC2 al replanificar |
| `sesion:{id}:metricas` | Hash | JSON con campos de `MetricasEnVivo_VO` | Sin TTL (se elimina al finalizar sesión) | BC2 en cada tick |
| `sesion:{id}:estado` | String | `EN_CURSO | PAUSADA | FINALIZADA` | Sin TTL | BC2 |

> **Nota:** Redis es caché de lectura rápida. La fuente de verdad siempre es PostgreSQL. Si Redis cae, los valores se reconstruyen leyendo PostgreSQL.

---

## Índices recomendados

```sql
-- Búsquedas frecuentes de equipaje por estado
CREATE INDEX idx_equipajes_estado ON equipajes(estado);

-- Búsqueda de vuelos por estado y fecha (filtros del operador)
CREATE INDEX idx_vuelos_estado ON vuelos(estado);
CREATE INDEX idx_vuelos_hora_salida ON vuelos(hora_salida);

-- Segmentos por plan de viaje (se consulta mucho al calcular rutas)
CREATE INDEX idx_segmentos_plan_viaje ON segmentos_plan(plan_viaje_id);

-- Items por lote
CREATE INDEX idx_items_lote ON items_lote(lote_id);

-- Puntos SLA por reporte (para construir el gráfico)
CREATE INDEX idx_puntos_sla_reporte ON puntos_sla(reporte_id, momento_virtual);

-- Auditoría por usuario
CREATE INDEX idx_auditoria_usuario ON entradas_auditoria(usuario_id, ocurrido_en);
```
