-- Reparar nodos con continente nulo o 'Desconocido'
UPDATE nodos_logisticos
SET continente = 'America'
WHERE (continente IS NULL OR continente = 'Desconocido')
  AND latitud >= -60 AND latitud <= 15
  AND longitud >= -80 AND longitud <= -35;

UPDATE nodos_logisticos
SET continente = 'Europe'
WHERE (continente IS NULL OR continente = 'Desconocido')
  AND latitud >= 35 AND latitud <= 70
  AND longitud >= -10 AND longitud <= 40;

UPDATE nodos_logisticos
SET continente = 'Asia'
WHERE (continente IS NULL OR continente = 'Desconocido')
  AND latitud >= 0 AND latitud <= 60
  AND longitud >= 40 AND longitud <= 130;

UPDATE nodos_logisticos
SET continente = 'Desconocido'
WHERE continente IS NULL;
