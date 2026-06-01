UPDATE vuelos SET estado = 'PROGRAMADO'
WHERE es_plantilla = true AND estado IS DISTINCT FROM 'PROGRAMADO';
