INSERT INTO plan_vuelos (id, descripcion, vigencia_desde, vigencia_hasta) VALUES
('00000000-0000-0000-0002-000000000001', 'Plan operativo inicial', '2025-06-01T00:00:00Z', '2025-12-31T23:59:59Z')
ON CONFLICT (id) DO NOTHING;