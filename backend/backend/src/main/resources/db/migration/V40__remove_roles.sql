-- Remove roles & simplify usuarios

DROP TABLE IF EXISTS entradas_auditoria;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_id_fkey;
ALTER TABLE usuarios DROP COLUMN IF EXISTS rol_id;

DROP TABLE IF EXISTS roles;

ALTER TABLE usuarios DROP COLUMN IF EXISTS hash_password;
ALTER TABLE usuarios DROP COLUMN IF EXISTS intentos_fallidos;
ALTER TABLE usuarios DROP COLUMN IF EXISTS ultimo_acceso;
ALTER TABLE usuarios DROP COLUMN IF EXISTS asignado_en;
ALTER TABLE usuarios ALTER COLUMN nodo_ref_id DROP NOT NULL;
