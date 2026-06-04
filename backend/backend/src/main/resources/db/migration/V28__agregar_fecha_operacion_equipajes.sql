ALTER TABLE equipajes ADD COLUMN IF NOT EXISTS fecha_operacion TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_equipajes_fecha_op ON equipajes(fecha_operacion);
