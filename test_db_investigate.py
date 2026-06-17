import paramiko, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('1inf54-983-4d.inf.pucp.edu.pe', username='1inf54.983.4d', password='Bw39q25X', timeout=10)
PW = 'Bw39q25X'

def run(cmd, timeout=15):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    return chan.makefile('r', -1).read()

# Check if LA1111 exists for 2026-06-01
print("=== Check LA1111 for 2026-06-01 ===")
print(run(f'echo {PW} | sudo -S -u postgres psql -d tasfb2b -c "SELECT id, codigo_vuelo, fecha_operacion, es_plantilla, estado FROM vuelos WHERE codigo_vuelo = \'LA1111\' AND fecha_operacion = \'2026-06-01\';" 2>/dev/null', timeout=10))

# Check what's in the table for 2026-06-01
print("\n=== All flights for 2026-06-01 (limit 10) ===")
print(run(f'echo {PW} | sudo -S -u postgres psql -d tasfb2b -c "SELECT codigo_vuelo, fecha_operacion, es_plantilla, COUNT(*) as cnt FROM vuelos WHERE fecha_operacion = \'2026-06-01\' GROUP BY codigo_vuelo, fecha_operacion, es_plantilla ORDER BY codigo_vuelo LIMIT 10;" 2>/dev/null', timeout=10))

# Total count for 2026-06-01
print("\n=== Total non-plantilla flights for 2026-06-01 ===")
print(run(f'echo {PW} | sudo -S -u postgres psql -d tasfb2b -c "SELECT COUNT(*) FROM vuelos WHERE fecha_operacion = \'2026-06-01\' AND NOT es_plantilla;" 2>/dev/null', timeout=10))

# Check for null values in es_plantilla
print("\n=== Null/not-null es_plantilla counts ===")
print(run(f'echo {PW} | sudo -S -u postgres psql -d tasfb2b -c "SELECT es_plantilla, COUNT(*) FROM vuelos GROUP BY es_plantilla;" 2>/dev/null', timeout=10))

# Check dupes that would violate the unique constraint
print("\n=== All duplicates violating constraint ===")
print(run(f'echo {PW} | sudo -S -u postgres psql -d tasfb2b -c "SELECT fecha_operacion, codigo_vuelo, COUNT(*) FROM vuelos WHERE es_plantilla = false AND fecha_operacion = \'2026-06-01\' GROUP BY fecha_operacion, codigo_vuelo HAVING COUNT(*) > 1;" 2>/dev/null', timeout=10))

# Check the constraint definition
print("\n=== Constraint/index definition ===")
print(run(f'echo {PW} | sudo -S -u postgres psql -d tasfb2b -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = \'vuelos\' AND indexname = \'idx_vuelos_fecha_codigo_instancias\';" 2>/dev/null', timeout=10))

client.close()
