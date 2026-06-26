INSERT INTO usuarios (id, nombre, correo, estado)
SELECT '00000000-0000-0000-0000-000000000001', 'Operador Generico', 'operador@tasfb2b.com', 'ACTIVO'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE correo = 'operador@tasfb2b.com');
