ALTER TABLE vuelos ADD COLUMN tag VARCHAR(64) NULL;
ALTER TABLE equipajes ADD COLUMN tag VARCHAR(64) NULL;
CREATE INDEX idx_vuelos_tag ON vuelos(tag);
CREATE INDEX idx_equipajes_tag ON equipajes(tag);