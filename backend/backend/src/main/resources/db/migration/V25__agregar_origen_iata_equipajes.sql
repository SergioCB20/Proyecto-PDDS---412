ALTER TABLE equipajes ADD COLUMN origen_iata VARCHAR(10) NOT NULL DEFAULT 'SKBO';
ALTER TABLE equipajes ALTER COLUMN origen_iata DROP DEFAULT;
CREATE INDEX idx_equipajes_origen ON equipajes(origen_iata);
