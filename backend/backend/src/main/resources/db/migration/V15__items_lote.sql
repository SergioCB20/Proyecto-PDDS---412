-- V15: Items de Lote (BC2)
CREATE TABLE items_lote (
    id                    UUID PRIMARY KEY,
    lote_id               UUID        NOT NULL REFERENCES lotes_replanificacion(id),
    equipaje_ref_id       UUID        NOT NULL,
    estado_replanificacion VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_items_lote_lote ON items_lote(lote_id);