CREATE TABLE pedidos_base_simulados (
    id UUID PRIMARY KEY,
    id_externo VARCHAR(50) NOT NULL,
    origen_iata VARCHAR(10) NOT NULL,
    destino_iata VARCHAR(10) NOT NULL,
    sla_comprometido TIMESTAMPTZ NOT NULL,
    fecha_ingreso_virtual TIMESTAMPTZ NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_pedidos_base_fecha ON pedidos_base_simulados(fecha_ingreso_virtual);
