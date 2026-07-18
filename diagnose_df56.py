#!/usr/bin/env python3
"""Quick check of new session df56b42e"""
import paramiko, base64

SID = 'df56b42e'
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
    return chan.makefile('r', -1).read()

def sql(q):
    b64 = base64.b64encode(q.encode()).decode()
    return run(f"echo {PW} | sudo -S -u postgres sh -c \"echo '{b64}' | base64 -d | psql -d {DB}\" 2>&1", timeout=60)

print("=== ALL SESSIONS ===")
print(sql("SELECT id::text, estado, dia_hora_virtual::text, tipo_simulacion, sa_segundos, k, segundos_reales_transcurridos, fecha_inicio_virtual, hora_inicio_virtual FROM sesiones_ejecucion ORDER BY id"))

# Full UUID lookup
id_res = sql(f"SELECT id::text FROM sesiones_ejecucion WHERE id::text LIKE '{SID}%' LIMIT 5")
import re
match = re.search(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', str(id_res))
if match:
    FULL = match.group(1)
    print(f"\n=== SESSION {FULL} ===")
    print(sql(f"SELECT id::text, estado, dia_hora_virtual, fecha_alineada_a, tipo_simulacion, sa_segundos, k, sla_acumulado_pct, segundos_reales_transcurridos FROM sesiones_ejecucion WHERE id = '{FULL}'"))
    
    print("\n=== READY? ===")
    print(run(f"echo {PW} | sudo -S grep -i '{FULL[:8]}' /opt/tomcat11/logs/catalina.out | grep -i 'ready\|readiness\|marcar\|lista\|EN_CURSO\|ARRANQUE' | tail -10", timeout=15))

client.close()
