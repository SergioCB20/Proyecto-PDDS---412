ALTER TABLE equipajes ADD COLUMN cliente_id VARCHAR(64) NULL;
CREATE INDEX idx_equipajes_cliente_id ON equipajes(cliente_id);
