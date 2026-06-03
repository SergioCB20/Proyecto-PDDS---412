ALTER TABLE nodos_logisticos ADD COLUMN continente VARCHAR(20);

UPDATE nodos_logisticos SET continente = 'Sur America'
WHERE codigo_iata IN ('SKBO','SEQM','SVMI','SBBR','SPIM','SLLP','SCEL','SABE','SGAS','SUAA');

UPDATE nodos_logisticos SET continente = 'Europa'
WHERE codigo_iata IN ('LATI','EDDI','LOWW','EBCI','UMMS','LBSF','LKPR','LDZA','EKCH','EHAM');

UPDATE nodos_logisticos SET continente = 'Asia'
WHERE codigo_iata IN ('VIDP','OSDI','OERK','OMDB','OAKB','OOMS','OYSN','OPKC','UBBB','OJAI');

ALTER TABLE nodos_logisticos ALTER COLUMN continente SET NOT NULL;
