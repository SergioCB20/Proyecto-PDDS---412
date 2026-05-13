-- V12: Sesiones de Ejecución (BC2)
CREATE TABLE sesiones_ejecucion (
    id                    UUID PRIMARY KEY,
    tipo                  VARCHAR(20)   NOT NULL,
    estado                VARCHAR(20)   NOT NULL DEFAULT 'CONFIGURADA',
    fecha_inicio_virtual  DATE          NOT NULL,
    hora_inicio_virtual   TIME          NOT NULL,
    fecha_inicio_real     TIMESTAMPTZ,
    fecha_fin_real        TIMESTAMPTZ,
    almacen_verde_min     DECIMAL(5,2)  NOT NULL DEFAULT 0,
    almacen_verde_max     DECIMAL(5,2)  NOT NULL DEFAULT 70,
    almacen_ambar_min     DECIMAL(5,2)  NOT NULL DEFAULT 70,
    almacen_ambar_max     DECIMAL(5,2)  NOT NULL DEFAULT 90,
    almacen_rojo_min      DECIMAL(5,2)  NOT NULL DEFAULT 90,
    almacen_rojo_max      DECIMAL(5,2)  NOT NULL DEFAULT 100,
    vuelo_verde_min       DECIMAL(5,2)  NOT NULL DEFAULT 0,
    vuelo_verde_max       DECIMAL(5,2)  NOT NULL DEFAULT 70,
    vuelo_ambar_min       DECIMAL(5,2)  NOT NULL DEFAULT 70,
    vuelo_ambar_max       DECIMAL(5,2)  NOT NULL DEFAULT 90,
    vuelo_rojo_min        DECIMAL(5,2)  NOT NULL DEFAULT 90,
    vuelo_rojo_max        DECIMAL(5,2)  NOT NULL DEFAULT 100,
    dia_hora_virtual      TIMESTAMPTZ,
    segundos_reales_transcurridos INT   DEFAULT 0,
    sla_acumulado_pct     DECIMAL(5,2) DEFAULT 0,
    vuelos_cancelados     INT    DEFAULT 0,
    maletas_replanificadas INT    DEFAULT 0,
    prob_cancelacion      DECIMAL(5,2) DEFAULT 0,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sesiones_estado ON sesiones_ejecucion(estado);
CREATE INDEX idx_sesiones_tipo ON sesiones_ejecucion(tipo);