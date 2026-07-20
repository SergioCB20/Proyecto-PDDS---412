#!/usr/bin/env python3
import paramiko

HOST = '1inf54-983-4d.inf.pucp.edu.pe'
USER = '1inf54.983.4d'
PW = 'Bw39q25X'
DB = 'tasfb2b_db'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PW, timeout=10)

def run(cmd, timeout=15):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    raw = chan.makefile('r', -1).read()
    if isinstance(raw, bytes):
        return raw.decode(errors='replace')
    return raw

pw = PW
db = DB

print("=== 1. Buscar archivos _envios_*.txt ===")
paths = [
    "/opt/tomcat11/webapps/ROOT/WEB-INF/classes/data/",
    "/opt/tomcat11/webapps/backend/WEB-INF/classes/data/",
    "/data/",
    "/opt/tomcat11/data/",
    "/home/",
    "/tmp/data/",
    "/opt/",
]
for p in paths:
    r = run(f"echo {pw} | sudo -S ls '{p}' 2>&1", timeout=5)
    if "_envios" in r or r.strip():
        print(f"\n--- {p} ---")
        print(r[:2000])

print("\n=== 2. find global _envios_ ===")
print(run(f"echo {pw} | sudo -S find / -name '_envios_*.txt' 2>/dev/null | head -50", timeout=30))

print("\n=== 3. Equipajes por origen S* ===")
q = "SELECT origen_iata, count(*), min(fecha_operacion), max(fecha_operacion) FROM equipajes WHERE origen_iata LIKE 'S%' GROUP BY origen_iata ORDER BY origen_iata;"
print(run(f"echo {pw} | sudo -S -u postgres psql -d {db} -c \"{q}\" 2>&1", timeout=60))

print("\n=== 4. Equipajes por origen restantes (E%, L%, O%, U%, V%) ===")
q = "SELECT origen_iata, count(*), min(fecha_operacion), max(fecha_operacion) FROM equipajes WHERE origen_iata LIKE 'E%' OR origen_iata LIKE 'L%' OR origen_iata LIKE 'O%' OR origen_iata LIKE 'U%' OR origen_iata LIKE 'V%' GROUP BY origen_iata ORDER BY origen_iata;"
print(run(f"echo {pw} | sudo -S -u postgres psql -d {db} -c \"{q}\" 2>&1", timeout=60))

print("\n=== 5. Equipajes total por origen_iata (todos) ===")
q = "SELECT origen_iata, count(*) FROM equipajes GROUP BY origen_iata ORDER BY origen_iata;"
print(run(f"echo {pw} | sudo -S -u postgres psql -d {db} -c \"{q}\" 2>&1", timeout=60))

client.close()
