DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vuelos' AND column_name = 'es_plantilla'
    ) THEN
        ALTER TABLE vuelos ADD COLUMN es_plantilla BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

UPDATE vuelos SET es_plantilla = true
WHERE es_plantilla IS DISTINCT FROM true
  AND hora_salida >= '2026-01-15T00:00:00Z'
  AND hora_salida < '2026-01-16T00:00:00Z';
