ALTER TABLE equipajes ADD COLUMN IF NOT EXISTS origen_iata VARCHAR(10) NOT NULL DEFAULT 'SKBO';
ALTER TABLE equipajes ALTER COLUMN origen_iata DROP DEFAULT;
CREATE INDEX IF NOT EXISTS idx_equipajes_origen ON equipajes(origen_iata);
