-- Repara columnas faltantes porque Flyway baseline-version=30 salta V21-V30.
-- Se usa IF NOT EXISTS para ser idempotente.

-- ============================================================
-- nodos_logisticos
-- ============================================================
ALTER TABLE nodos_logisticos ADD COLUMN IF NOT EXISTS zona_horaria VARCHAR(50);
ALTER TABLE nodos_logisticos ADD COLUMN IF NOT EXISTS continente VARCHAR(20);

-- ============================================================
-- vuelos
-- ============================================================
ALTER TABLE vuelos ADD COLUMN IF NOT EXISTS es_plantilla BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vuelos ADD COLUMN IF NOT EXISTS fecha_operacion DATE;

-- ============================================================
-- equipajes
-- ============================================================
ALTER TABLE equipajes ADD COLUMN IF NOT EXISTS origen_iata VARCHAR(10) NOT NULL DEFAULT 'SKBO';
ALTER TABLE equipajes ALTER COLUMN origen_iata DROP DEFAULT;
ALTER TABLE equipajes ADD COLUMN IF NOT EXISTS cantidad INT NOT NULL DEFAULT 1;
ALTER TABLE equipajes ADD COLUMN IF NOT EXISTS fecha_operacion TIMESTAMPTZ;

-- ============================================================
-- sesiones_ejecucion (V29)
-- ============================================================
ALTER TABLE sesiones_ejecucion ADD COLUMN IF NOT EXISTS tipo_simulacion VARCHAR(20);
ALTER TABLE sesiones_ejecucion ADD COLUMN IF NOT EXISTS ventana_horas INT;
ALTER TABLE sesiones_ejecucion ADD COLUMN IF NOT EXISTS duracion_dias INT;

-- ============================================================
-- Marcar plantillas seed (V30)
-- ============================================================
UPDATE vuelos SET es_plantilla = true WHERE codigo_vuelo LIKE 'TAS%';
