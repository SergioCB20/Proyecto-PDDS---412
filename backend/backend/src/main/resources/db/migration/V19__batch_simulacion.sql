-- V19: Batch Simulation - SLA ordering for cola_planificacion
ALTER TABLE cola_planificacion ADD COLUMN sla_comprometido TIMESTAMPTZ;

CREATE INDEX idx_cola_planificacion_batch ON cola_planificacion(estado, sla_comprometido) WHERE sla_comprometido IS NOT NULL;
