-- Índice para la detección eficiente del primer incumplimiento de SLA (colapso de simulación).
-- TickService.detectarIncumplimientoSla consulta por sla_comprometido < limite en cada tick;
-- sin índice eso era un full scan de millones de filas.
CREATE INDEX IF NOT EXISTS idx_equipajes_sla_comprometido ON equipajes (sla_comprometido);
