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

# Try different method - read from DB using specific query with output to file
r = run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b -c 'SELECT count(*) FROM vuelos;' 2>&1", timeout=10)
print("=== Vuelos count ===")
print(r)

r = run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b -c 'SELECT id::text, codigo_vuelo, fecha_operacion, es_plantilla FROM vuelos WHERE codigo_vuelo = '\"'\"'LA1111'\"'\"' AND fecha_operacion = '\"'\"'2026-06-01'\"'\"';' 2>&1", timeout=10)
print("=== LA1111 on 2026-06-01 ===")
print(r)

r = run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b << 'EOF'
SELECT codigo_vuelo, fecha_operacion, es_plantilla, COUNT(*) as cnt 
FROM vuelos 
WHERE fecha_operacion = '2026-06-01' AND es_plantilla = false
GROUP BY codigo_vuelo, fecha_operacion, es_plantilla 
HAVING COUNT(*) > 1 
LIMIT 10;
EOF", timeout=10)
print("=== Duplicates on 2026-06-01 ===")
print(r)

r = run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b << 'EOF'
SELECT fecha_operacion, COUNT(*) 
FROM vuelos 
WHERE NOT es_plantilla 
GROUP BY fecha_operacion 
ORDER BY fecha_operacion;
EOF", timeout=10)
print("=== Non-plantilla flights by date ===")
print(r)

r = run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b -c 'SELECT indexname, indexdef FROM pg_indexes WHERE tablename = '\"'\"'vuelos'\"'\"';' 2>&1", timeout=10)
print("=== All vuelos indexes ===")
print(r)

client.close()
