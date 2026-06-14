-- Poblar continente y zona_horaria cuando esten vacios
-- (V31 agrego las columnas pero sin datos porque V21-V30 fueron saltados)

UPDATE nodos_logisticos SET continente = 'Sur America'
WHERE (continente IS NULL OR continente = '')
AND codigo_iata IN ('SKBO','SEQM','SVMI','SBBR','SPIM','SLLP','SCEL','SABE','SGAS','SUAA');

UPDATE nodos_logisticos SET continente = 'Europa'
WHERE (continente IS NULL OR continente = '')
AND codigo_iata IN ('LATI','EDDI','LOWW','EBCI','UMMS','LBSF','LKPR','LDZA','EKCH','EHAM');

UPDATE nodos_logisticos SET continente = 'Asia'
WHERE (continente IS NULL OR continente = '')
AND codigo_iata IN ('VIDP','OSDI','OERK','OMDB','OAKB','OOMS','OYSN','OPKC','UBBB','OJAI');

UPDATE nodos_logisticos SET continente = 'Desconocido'
WHERE continente IS NULL OR continente = '';

UPDATE nodos_logisticos SET zona_horaria = 'America/Bogota'              WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'SKBO';
UPDATE nodos_logisticos SET zona_horaria = 'America/Guayaquil'           WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'SEQM';
UPDATE nodos_logisticos SET zona_horaria = 'America/Caracas'             WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'SVMI';
UPDATE nodos_logisticos SET zona_horaria = 'America/Sao_Paulo'           WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'SBBR';
UPDATE nodos_logisticos SET zona_horaria = 'America/Lima'                WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'SPIM';
UPDATE nodos_logisticos SET zona_horaria = 'America/La_Paz'              WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'SLLP';
UPDATE nodos_logisticos SET zona_horaria = 'America/Santiago'            WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'SCEL';
UPDATE nodos_logisticos SET zona_horaria = 'America/Argentina/Buenos_Aires' WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'SABE';
UPDATE nodos_logisticos SET zona_horaria = 'America/Asuncion'            WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'SGAS';
UPDATE nodos_logisticos SET zona_horaria = 'America/Montevideo'          WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'SUAA';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Tirane'               WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'LATI';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Berlin'               WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'EDDI';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Vienna'               WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'LOWW';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Brussels'             WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'EBCI';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Minsk'                WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'UMMS';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Sofia'                WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'LBSF';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Prague'               WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'LKPR';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Zagreb'               WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'LDZA';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Copenhagen'           WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'EKCH';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Amsterdam'            WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'EHAM';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Kolkata'                WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'VIDP';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Damascus'               WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'OSDI';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Riyadh'                 WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'OERK';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Dubai'                  WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'OMDB';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Kabul'                  WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'OAKB';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Muscat'                 WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'OOMS';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Aden'                   WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'OYSN';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Karachi'                WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'OPKC';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Baku'                   WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'UBBB';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Amman'                  WHERE (zona_horaria IS NULL OR zona_horaria = '') AND codigo_iata = 'OJAI';
