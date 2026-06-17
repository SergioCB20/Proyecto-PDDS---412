-- Índice para acelerar la búsqueda de equipajes por vuelo_actual_id
-- Usado en VueloService.eliminarInstanciasPorFecha() → findByVueloActualIdIn()
-- Sin este índice, cada limpieza de sesión hacía un full scan de ~7.7M equipajes
CREATE INDEX IF NOT EXISTS idx_equipajes_vuelo_actual
    ON equipajes(vuelo_actual_id)
    WHERE vuelo_actual_id IS NOT NULL;

-- Índice para acelerar la búsqueda de segmentos por vuelo_id
-- Usado en VueloService.eliminarInstanciasPorFecha() → findByVueloIdIn()
CREATE INDEX IF NOT EXISTS idx_segmentos_vuelo_id
    ON segmentos_plan(vuelo_id);
