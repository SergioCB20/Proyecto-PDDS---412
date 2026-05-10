CREATE TABLE equipajes (
    id               UUID PRIMARY KEY,
    plan_viaje_id    UUID         REFERENCES planes_viaje(id),
    vuelo_actual_id  UUID         REFERENCES vuelos(id),
    estado           VARCHAR(50)  NOT NULL DEFAULT 'REGISTRADO',
    id_externo       VARCHAR(100),
    fecha_ingreso    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    destino_iata     VARCHAR(10)  NOT NULL,
    sla_comprometido TIMESTAMPTZ  NOT NULL
);

ALTER TABLE equipajes ADD CONSTRAINT chk_equipaje_estado
    CHECK (estado IN ('REGISTRADO', 'ENRUTADO', 'EN_REPLANIFICACION',
                      'EN_VUELO', 'EN_ALMACEN', 'ENTREGADO', 'INCUMPLIMIENTO_SLA'));

CREATE INDEX idx_equipajes_estado ON equipajes(estado);
CREATE INDEX idx_equipajes_destino ON equipajes(destino_iata);
CREATE INDEX idx_equipajes_id_externo ON equipajes(id_externo);