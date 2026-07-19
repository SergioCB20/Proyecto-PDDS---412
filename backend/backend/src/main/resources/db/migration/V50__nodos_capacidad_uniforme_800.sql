-- =====================================================
-- V50: Capacidad de almacén uniforme 800
-- =====================================================
-- V49 había diferenciado capacidades (500-800) por categoría de hub
-- (saturados, medianos, periféricos, menores) tras observar picos
-- de 130% de ocupación en sesiones de 5 días virtuales.
--
-- En sesiones más largas con replanificaciones encadenadas los colapsos
-- siguieron apareciendo en hubs medianos antes de lo esperado. Para
-- estabilizar el modelo mientras se calibran los umbrales rojo/ámbar
-- en producción, uniformamos TODOS los 30 nodos a 800 (cap máximo del
-- rango original). El tope real por nodo se mantiene en V47 (subselect
-- desde OcupacionNodoService.ajustar) — este cambio sólo relaja el
-- límite declarado por NodoLogistico.capacidad_almacen.
--
-- Nota: V50 es idempotente y se aplica DESPUÉS de V49. Si en algún
-- entorno V49 aún no se ejecutó, este migration lleva a 800 de
-- cualquier modo.

BEGIN;

UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'SKBO';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'SEQM';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'SVMI';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'SBBR';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'SPIM';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'SLLP';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'SCEL';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'SABE';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'SGAS';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'SUAA';

UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'LATI';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'EDDI';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'LOWW';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'EBCI';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'UMMS';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'LBSF';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'LKPR';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'LDZA';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'EKCH';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'EHAM';

UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'VIDP';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'OSDI';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'OERK';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'OMDB';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'OAKB';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'OOMS';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'OYSN';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'OPKC';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'UBBB';
UPDATE nodos_logisticos SET capacidad_almacen = 800 WHERE codigo_iata = 'OJAI';

COMMIT;
