-- V16: Reportes de Sesión (BC2)
CREATE TABLE reportes_sesion (
    id                    UUID PRIMARY KEY,
    sesion_id             UUID          NOT NULL UNIQUE REFERENCES sesiones_ejecucion(id),
    sla_incumplido_pct    DECIMAL(5,2)  NOT NULL,
    total_replanificadas  INT           NOT NULL,
    punto_colapso_virtual TIMESTAMPTZ,
    nodo_colapso_ref_id   UUID,
    causa_colapso         VARCHAR(255),
    generado_en           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);