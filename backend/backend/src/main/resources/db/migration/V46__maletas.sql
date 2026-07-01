-- Cada Equipaje puede representar N maletas fisicas. Hasta V45 el conteo
-- se llevaba en la columna `cantidad`, pero cada maleta necesitaba su propio
-- identificador para trazabilidad individual. Esta migracion crea la tabla
-- `maletas`, hija 1:N de `equipajes`, con `codigo_maleta` UNIQUE.
--
-- El codigo sigue el patron "MAL-<id_externo_equipaje>-NN" para N en [1, cantidad];
-- si el id_externo del equipaje excede 20 chars se trunca a 20 para no
-- romper el limite VARCHAR(50).

CREATE TABLE maletas (
    id              UUID PRIMARY KEY,
    codigo_maleta   VARCHAR(50) NOT NULL UNIQUE,
    equipaje_id     UUID NOT NULL REFERENCES equipajes(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maletas_equipaje_id ON maletas(equipaje_id);

-- Backfill: para cada equipaje existente con su propio id_externo, generar N filas
-- de maleta de modo que el nuevo endpoint devuelva datos al migrar. Equipajes
-- con id_externo nulo (importacion inicial txt) reciben codigo derivado del id.
DO $$
DECLARE
    eq RECORD;
    prefijo TEXT;
    ancho INT;
    codigo TEXT;
    i INT;
BEGIN
    FOR eq IN
        SELECT id, COALESCE(id_externo, id::text) AS pref, COALESCE(cantidad, 1) AS cant
        FROM equipajes
    LOOP
        prefijo := LEFT(eq.pref, 20);
        ancho := GREATEST(LENGTH(eq.cant::text), 2);
        i := 1;
        WHILE i <= eq.cant LOOP
            codigo := 'MAL-' || prefijo || '-' || LPAD(i::text, ancho, '0');
            IF NOT EXISTS (SELECT 1 FROM maletas WHERE codigo_maleta = codigo) THEN
                INSERT INTO maletas (id, codigo_maleta, equipaje_id, created_at)
                VALUES (md5(random()::text)::uuid, codigo, eq.id, NOW() + (i * interval '1 millisecond'));
            END IF;
            i := i + 1;
        END LOOP;
    END LOOP;
END $$;

