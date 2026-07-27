-- Causa concreta del colapso, registrada por TickService en el momento de detectarlo.
-- Antes el reporte solo podía mostrar un texto genérico ("incumplimiento de SLA o
-- saturación de almacén") porque el detector no dejaba rastro de cuál de las dos
-- condiciones se disparó ni en qué nodo.
ALTER TABLE sesiones_ejecucion ADD COLUMN IF NOT EXISTS causa_colapso VARCHAR(300);
