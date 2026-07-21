#!/usr/bin/env python3
"""Diagnostico de carga colgada"""
import paramiko

HOST = '1inf54-983-4d.inf.pucp.edu.pe'
USER = '1inf54.983.4d'
PW = 'Bw39q25X'
DB = 'tasfb2b_db'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PW, timeout=10)

def run(cmd, timeout=30):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    chan.shutdown_write()
    out = b''
    while not chan.exit_status_ready():
        try: chunk = chan.recv(4096); out += chunk
        except: break
    while True:
        try: chunk = chan.recv(4096); out += chunk
        except: break
    return out.decode('latin-1', errors='replace')

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

section("1. Flyway V52 aplicada?")
r = run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT version, description, success, installed_on FROM flyway_schema_history WHERE version='V52';\" 2>&1", 30)
print(r.encode('ascii', errors='replace').decode('ascii'))

section("2. Indices en cola_planificacion")
r = run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"\\d cola_planificacion\" 2>&1", 30)
print(r.encode('ascii', errors='replace').decode('ascii'))

section("3. Queries activas en BD")
r = run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT pid, state, query_start, LEFT(query, 250) as q FROM pg_stat_activity WHERE state IN ('active', 'idle in transaction') AND query NOT LIKE '%pg_stat%' ORDER BY query_start;\" 2>&1", 30)
print(r.encode('ascii', errors='replace').decode('ascii'))

section("4. Conteos equipajes por origen")
r = run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT origen_iata, count(*) FROM equipajes GROUP BY origen_iata ORDER BY origen_iata;\" 2>&1", 30)
print(r.encode('ascii', errors='replace').decode('ascii'))

section("5. Conteos cola_planificacion")
r = run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT count(*) AS total_cola FROM cola_planificacion;\" 2>&1", 30)
print(r.encode('ascii', errors='replace').decode('ascii'))

section("6. Logs Tomcat (carga)")
r = run(f"echo {PW} | sudo -S grep -i 'carga\\|cola_planificacion\\|eliminar\\|equipaje' /opt/tomcat11/logs/catalina.out 2>&1 | tail -30", 30)
print(r.encode('ascii', errors='replace').decode('ascii'))

section("7. Ultimo log Tomcat")
r = run(f"echo {PW} | sudo -S tail -40 /opt/tomcat11/logs/catalina.out 2>&1", 30)
print(r.encode('ascii', errors='replace').decode('ascii'))

client.close()
print("\n✅ Diagnostico completado.")
