-- =====================================================
-- V49: Ajuste de capacidades de almacén (rango 500-800)
-- =====================================================
-- Las capacidades originales (400-480) resultaron demasiado pequeñas para
-- sostener el flujo de equipajes durante sesiones de 5 días virtuales. Los
-- picos de ocupación llegaron a 130% en hubs como LKPR, OOMS, OMDB.
--
-- Esta migración aumenta capacidad_almacen de los 30 nodos dentro del rango
-- estricto 500-800, diferenciando:
--   - Hubs saturados: 650-750 (peak histórico >500)
--   - Hubs medianos: 580-620 (peak histórico 460-540)
--   - Periféricos/origenes grandes: 500-550 (peak histórico bajo pero origenes con >280k envios)
--   - Menores (sin peak, origenes pequenos): 500 (minimo del rango)

BEGIN;

-- Caps basadas en diagnostico de picos de ocupacion en sesiones colapsadas.
-- Cada UPDATE toma el codigo_iata y asigna capacidad dentro de [500, 800].
UPDATE nodos_logisticos SET capacidad_almacen = 700 WHERE codigo_iata = 'LKPR';
UPDATE nodos_logisticos SET capacidad_almacen = 750 WHERE codigo_iata = 'OOMS';
UPDATE nodos_logisticos SET capacidad_almacen = 700 WHERE codigo_iata = 'OMDB';
UPDATE nodos_logisticos SET capacidad_almacen = 650 WHERE codigo_iata = 'LBSF';
UPDATE nodos_logisticos SET capacidad_almacen = 700 WHERE codigo_iata = 'OSDI';
UPDATE nodos_logisticos SET capacidad_almacen = 650 WHERE codigo_iata = 'OPKC';
UPDATE nodos_logisticos SET capacidad_almacen = 650 WHERE codigo_iata = 'OYSN';
UPDATE nodos_logisticos SET capacidad_almacen = 700 WHERE codigo_iata = 'OJAI';
UPDATE nodos_logisticos SET capacidad_almacen = 750 WHERE codigo_iata = 'EBCI';
UPDATE nodos_logisticos SET capacidad_almacen = 650 WHERE codigo_iata = 'OERK';
UPDATE nodos_logisticos SET capacidad_almacen = 650 WHERE codigo_iata = 'LATI';
UPDATE nodos_logisticos SET capacidad_almacen = 700 WHERE codigo_iata = 'OAKB';
UPDATE nodos_logisticos SET capacidad_almacen = 620 WHERE codigo_iata = 'LOWW';
UPDATE nodos_logisticos SET capacidad_almacen = 600 WHERE codigo_iata = 'LDZA';
UPDATE nodos_logisticos SET capacidad_almacen = 700 WHERE codigo_iata = 'EDDI';
UPDATE nodos_logisticos SET capacidad_almacen = 700 WHERE codigo_iata = 'EKCH';
UPDATE nodos_logisticos SET capacidad_almacen = 700 WHERE codigo_iata = 'EHAM';
UPDATE nodos_logisticos SET capacidad_almacen = 600 WHERE codigo_iata = 'SABE';

UPDATE nodos_logisticos SET capacidad_almacen = 600 WHERE codigo_iata = 'VIDP';

UPDATE nodos_logisticos SET capacidad_almacen = 550 WHERE codigo_iata = 'SVMI';
UPDATE nodos_logisticos SET capacidad_almacen = 550 WHERE codigo_iata = 'SBBR';
UPDATE nodos_logisticos SET capacidad_almacen = 550 WHERE codigo_iata = 'SPIM';
UPDATE nodos_logisticos SET capacidad_almacen = 550 WHERE codigo_iata = 'SLLP';
UPDATE nodos_logisticos SET capacidad_almacen = 550 WHERE codigo_iata = 'SKBO';
UPDATE nodos_logisticos SET capacidad_almacen = 550 WHERE codigo_iata = 'SCEL';
UPDATE nodos_logisticos SET capacidad_almacen = 550 WHERE codigo_iata = 'SEQM';
UPDATE nodos_logisticos SET capacidad_almacen = 550 WHERE codigo_iata = 'UMMS';
UPDATE nodos_logisticos SET capacidad_almacen = 500 WHERE codigo_iata = 'UBBB';
UPDATE nodos_logisticos SET capacidad_almacen = 500 WHERE codigo_iata = 'SUAA';
UPDATE nodos_logisticos SET capacidad_almacen = 500 WHERE codigo_iata = 'SGAS';

COMMIT;
