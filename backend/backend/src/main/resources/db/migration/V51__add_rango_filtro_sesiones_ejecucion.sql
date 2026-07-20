BEGIN;

ALTER TABLE sesiones_ejecucion
    ADD COLUMN IF NOT EXISTS fecha_filtro_desde timestamptz;

ALTER TABLE sesiones_ejecucion
    ADD COLUMN IF NOT EXISTS fecha_filtro_hasta timestamptz;

COMMIT;
