CREATE INDEX IF NOT EXISTS idx_segmentos_plan_viaje_orden_estado
    ON segmentos_plan(plan_viaje_id, orden, estado);

CREATE INDEX IF NOT EXISTS idx_segmentos_plan_viaje_estado
    ON segmentos_plan(plan_viaje_id, estado);
