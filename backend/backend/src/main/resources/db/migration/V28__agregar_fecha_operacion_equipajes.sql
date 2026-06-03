ALTER TABLE equipajes ADD COLUMN fecha_operacion TIMESTAMPTZ;
CREATE INDEX idx_equipajes_fecha_op ON equipajes(fecha_operacion);
