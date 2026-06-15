-- Poblar continente y zona_horaria cuando esten vacios
-- (V31 agrego las columnas pero sin datos porque V21-V30 fueron saltados)

UPDATE nodos_logisticos SET continente = 'America'
WHERE codigo_iata IN ('SKBO','SEQM','SVMI','SBBR','SPIM','SLLP','SCEL','SABE','SGAS','SUAA');

UPDATE nodos_logisticos SET continente = 'Europe'
WHERE codigo_iata IN ('LATI','EDDI','LOWW','EBCI','UMMS','LBSF','LKPR','LDZA','EKCH','EHAM');

UPDATE nodos_logisticos SET continente = 'Asia'
WHERE codigo_iata IN ('VIDP','OSDI','OERK','OMDB','OAKB','OOMS','OYSN','OPKC','UBBB','OJAI');

UPDATE nodos_logisticos SET zona_horaria = 'America/Bogota'              WHERE codigo_iata = 'SKBO';
UPDATE nodos_logisticos SET zona_horaria = 'America/Guayaquil'           WHERE codigo_iata = 'SEQM';
UPDATE nodos_logisticos SET zona_horaria = 'America/Caracas'             WHERE codigo_iata = 'SVMI';
UPDATE nodos_logisticos SET zona_horaria = 'America/Sao_Paulo'           WHERE codigo_iata = 'SBBR';
UPDATE nodos_logisticos SET zona_horaria = 'America/Lima'                WHERE codigo_iata = 'SPIM';
UPDATE nodos_logisticos SET zona_horaria = 'America/La_Paz'              WHERE codigo_iata = 'SLLP';
UPDATE nodos_logisticos SET zona_horaria = 'America/Santiago'            WHERE codigo_iata = 'SCEL';
UPDATE nodos_logisticos SET zona_horaria = 'America/Argentina/Buenos_Aires' WHERE codigo_iata = 'SABE';
UPDATE nodos_logisticos SET zona_horaria = 'America/Asuncion'            WHERE codigo_iata = 'SGAS';
UPDATE nodos_logisticos SET zona_horaria = 'America/Montevideo'          WHERE codigo_iata = 'SUAA';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Tirane'               WHERE codigo_iata = 'LATI';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Berlin'               WHERE codigo_iata = 'EDDI';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Vienna'               WHERE codigo_iata = 'LOWW';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Brussels'             WHERE codigo_iata = 'EBCI';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Minsk'                WHERE codigo_iata = 'UMMS';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Sofia'                WHERE codigo_iata = 'LBSF';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Prague'               WHERE codigo_iata = 'LKPR';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Zagreb'               WHERE codigo_iata = 'LDZA';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Copenhagen'           WHERE codigo_iata = 'EKCH';
UPDATE nodos_logisticos SET zona_horaria = 'Europe/Amsterdam'            WHERE codigo_iata = 'EHAM';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Kolkata'                WHERE codigo_iata = 'VIDP';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Damascus'               WHERE codigo_iata = 'OSDI';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Riyadh'                 WHERE codigo_iata = 'OERK';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Dubai'                  WHERE codigo_iata = 'OMDB';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Kabul'                  WHERE codigo_iata = 'OAKB';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Muscat'                 WHERE codigo_iata = 'OOMS';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Aden'                   WHERE codigo_iata = 'OYSN';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Karachi'                WHERE codigo_iata = 'OPKC';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Baku'                   WHERE codigo_iata = 'UBBB';
UPDATE nodos_logisticos SET zona_horaria = 'Asia/Amman'                  WHERE codigo_iata = 'OJAI';
