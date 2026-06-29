-- V44: Agregar dispositivo_id para control de sesion por dispositivo
ALTER TABLE sesiones_ejecucion ADD COLUMN dispositivo_id VARCHAR(36);
CREATE INDEX idx_sesiones_dispositivo ON sesiones_ejecucion(dispositivo_id);
