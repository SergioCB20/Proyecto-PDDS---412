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
