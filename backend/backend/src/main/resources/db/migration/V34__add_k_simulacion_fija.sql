-- V34: Parámetros de planificación fija para simulación 5D
-- k: factor tiempo_virtual/tiempo_real (default 120 → 60 min real para 5 días)
-- Con tick=5s: avance_virtual = (5 × k) / 60 minutos por tick
-- k=120 → 10 min virtuales/tick → 5 días = 720 ticks = 3600s = 60 min real
-- k=240 → 20 min virtuales/tick → 5 días = 360 ticks = 1800s = 30 min real
ALTER TABLE sesiones_ejecucion ADD COLUMN IF NOT EXISTS k DECIMAL(8,2) NOT NULL DEFAULT 120;

-- sa_segundos: intervalo (salto) del planificador ACO en segundos reales (default 30s)
ALTER TABLE sesiones_ejecucion ADD COLUMN IF NOT EXISTS sa_segundos INT NOT NULL DEFAULT 30;
