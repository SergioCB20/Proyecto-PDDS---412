#!/usr/bin/env python3
import paramiko

HOST = '1inf54-983-4d.inf.pucp.edu.pe'
USER = '1inf54.983.4d'
PW = 'Bw39q25X'
DB = 'tasfb2b_db'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PW, timeout=10)

def run(cmd, timeout=20):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    chan.shutdown_write()
    out = b''
    try:
        while True:
            chunk = chan.recv(4096)
            if not chunk: break
            out += chunk
    except Exception:
        pass
    return out.decode('latin-1', errors='replace')

def section(t):
    print('\n' + '='*60)
    print('  ' + t)
    print('='*60)

# 1. Flyway V52
section('1. Flyway V52')
r = run("echo " + PW + " | sudo -S -u postgres psql -d " + DB + " -c \"SELECT version, success, installed_on FROM flyway_schema_history WHERE version='V52';\" 2>&1", 15)
print(r.encode('ascii', 'replace').decode('ascii'))

# 2. Indice
section('2. Indices cola_planificacion')
r = run("echo " + PW + " | sudo -S -u postgres psql -d " + DB + " -c \"\\d cola_planificacion\" 2>&1", 15)
print(r.encode('ascii', 'replace').decode('ascii'))

# 3. Conteos
section('3. Conteos equipajes por origen')
r = run("echo " + PW + " | sudo -S -u postgres psql -d " + DB + " -c \"SELECT origen_iata, count(*) FROM equipajes GROUP BY origen_iata ORDER BY origen_iata;\" 2>&1", 15)
print(r.encode('ascii', 'replace').decode('ascii'))

section('4. Conteo cola_planificacion')
r = run("echo " + PW + " | sudo -S -u postgres psql -d " + DB + " -c \"SELECT count(*) FROM cola_planificacion;\" 2>&1", 15)
print(r.encode('ascii', 'replace').decode('ascii'))

# 5. Logs
section('5. Logs carga')
r = run("echo " + PW + " | sudo -S grep -i 'carga\\|cola_planif\\|Procesando\\|Completado\\|ERROR' /opt/tomcat11/logs/catalina.out 2>&1 | tail -30", 15)
print(r.encode('ascii', 'replace').decode('ascii'))

# 6. active queries
section('6. Active queries')
r = run("echo " + PW + " | sudo -S -u postgres psql -d " + DB + " -c \"SELECT pid, state, query_start::timestamp(0), LEFT(query, 200) FROM pg_stat_activity WHERE state IN ('active', 'idle in transaction') AND pid <> pg_backend_pid() ORDER BY query_start LIMIT 20;\" 2>&1", 15)
print(r.encode('ascii', 'replace').decode('ascii'))

client.close()
print('\nListo')
