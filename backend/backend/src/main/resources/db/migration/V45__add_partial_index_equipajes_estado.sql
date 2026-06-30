-- Partial index: only non-REGISTRADO rows (~200 vs 9.5M total).
-- Speeds up UPDATE equipajes SET estado = 'REGISTRADO' WHERE estado <> 'REGISTRADO'
-- and any other query filtering on estado with the most common value excluded.
CREATE INDEX IF NOT EXISTS idx_equipajes_estado_no_reg
    ON equipajes(estado)
    WHERE estado <> 'REGISTRADO';
