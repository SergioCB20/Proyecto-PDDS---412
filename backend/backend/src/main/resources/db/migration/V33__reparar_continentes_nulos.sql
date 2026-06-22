-- Reparar nodos con continente nulo o 'Desconocido'
-- Usa las coordenadas (latitud) para determinar el continente cuando sea posible

-- America del Sur: latitud entre -60 y 15, longitud entre -80 y -35
UPDATE nodos_logisticos
SET continente = 'America'
WHERE (continente IS NULL OR continente = 'Desconocido')
  AND latitud >= -60 AND latitud <= 15
  AND longitud >= -80 AND longitud <= -35;

-- Europa: latitud entre 35 y 70, longitud entre -10 y 40
UPDATE nodos_logisticos
SET continente = 'Europe'
WHERE (continente IS NULL OR continente = 'Desconocido')
  AND latitud >= 35 AND latitud <= 70
  AND longitud >= -10 AND longitud <= 40;

-- Asia: latitud entre 0 y 60, longitud entre 40 y 130
UPDATE nodos_logisticos
SET continente = 'Asia'
WHERE (continente IS NULL OR continente = 'Desconocido')
  AND latitud >= 0 AND latitud <= 60
  AND longitud >= 40 AND longitud <= 130;

-- Cualquier nodo que aun quede nulo
UPDATE nodos_logisticos
SET continente = 'Desconocido'
WHERE continente IS NULL;
