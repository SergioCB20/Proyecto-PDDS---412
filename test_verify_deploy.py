import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('1inf54-983-4d.inf.pucp.edu.pe', username='1inf54.983.4d', password='Bw39q25X', timeout=10)
PW = 'Bw39q25X'
DB = 'tasfb2b_db'

def run(cmd, timeout=10):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    return chan.makefile('r', -1).read()

# Check flyway schema history
print("=== Flyway migrations applied ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT version, description, installed_on, success FROM flyway_schema_history ORDER BY version;\" 2>&1", timeout=10))

# Check duplicate plantillas were removed
print("\n=== LA1111 plantillas count ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT codigo_vuelo, count(*) FROM vuelos WHERE es_plantilla = true AND codigo_vuelo = 'LA1111' GROUP BY codigo_vuelo;\" 2>&1", timeout=10))

# Check total plantillas vs distinct
print("\n=== Total vs distinct plantillas ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT count(*) as total, count(distinct codigo_vuelo) as distinct_count FROM vuelos WHERE es_plantilla = true;\" 2>&1", timeout=10))

# Check index was created
print("\n=== New index exists ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT indexname FROM pg_indexes WHERE tablename = 'equipajes' AND indexname = 'idx_equipajes_estado_fop';\" 2>&1", timeout=10))

# Check if app is responding
print("\n=== Health check ===")
print(run(f"curl -s http://localhost:8080/health 2>&1", timeout=5))

client.close()
