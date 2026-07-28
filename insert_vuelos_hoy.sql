-- =====================================================
-- Insertar vuelos historicos EN_RUTA para hoy (2026-07-27)
-- Basado en plantillas, con carga aleatoria y tag_historico
-- =====================================================

-- 1. Limpiar historicos previos de hoy
DELETE FROM vuelos WHERE fecha_operacion = '2026-07-27' AND tag = 'tag_historico';

-- 2. Insertar todos los vuelos historicos desde plantillas
INSERT INTO vuelos (id, plan_vuelos_id, codigo_vuelo, estado,
    origen_id, destino_id, origen_lat, origen_lon, destino_lat, destino_lon,
    capacidad_carga, carga_disponible,
    hora_salida, hora_llegada,
    es_plantilla, fecha_operacion, tag)
SELECT
    gen_random_uuid(),
    plan_vuelos_id,
    codigo_vuelo,
    'EN_RUTA',
    origen_id,
    destino_id,
    origen_lat,
    origen_lon,
    destino_lat,
    destino_lon,
    capacidad_carga,
    floor(random() * (capacidad_carga + 1))::int,
    ('2026-07-27'::date + hora_salida::timetz),
    ('2026-07-27'::date + hora_salida::timetz + (hora_llegada - hora_salida)),
    false,
    '2026-07-27',
    'tag_historico'
FROM vuelos
WHERE es_plantilla = true;
