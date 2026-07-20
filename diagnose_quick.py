#!/usr/bin/env python3
"""Quick session diagnostic - planifier window logs"""
import paramiko, base64

SID = 'e609a2b8'
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

# Check session status (quick)
print("=== SESSION ===")
print(sql(f"SELECT id::text, estado, dia_hora_virtual::text, sla_acumulado_pct, segundos_reales_transcurridos FROM sesiones_ejecucion WHERE id::text LIKE '{SID}%'"))

# Check occupancy
print("\n=== OCCUPANCY ===")
print(sql(f"SELECT count(*) FROM ocupacion_nodo WHERE sesion_id::text LIKE '{SID}%'"))

# Check if the transaction is committing: count REGISTRADO vs ENRUTADO
print("\n=== EQUIPAJE ESTADOS (quick index) ===")
# Use estimate from pg_class for a quick count
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT 'checking...' as status; \" 2>&1", timeout=5))

# Check equipaje routing success: count of plan_viaje for this session
print("\n=== PLANES VIAJE for session ===")
print(sql(f"SELECT count(*) FROM planes_viaje WHERE sesion_id::text LIKE '{SID}%'"))

# Check equipment estados - just REGISTRADO total via estimate
print("\n=== EQUIPAJE estimates ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT relname, n_live_tup FROM pg_stat_all_tables WHERE relname = 'equipajes';\" 2>&1", timeout=5))

# Check vuelos carga_disponible changes (are they decrementing?)
print("\n=== VUELO carga_disponible sample (compare to original) ===")
print(sql(f"SELECT codigo_vuelo, carga_disponible FROM vuelos WHERE NOT es_plantilla ORDER BY RANDOM() LIMIT 5"))

# Check catalina for tick VIRT logs (last 3)
print("\n=== LAST 3 TICK LOGS ===")
print(run(f"echo {PW} | sudo -S grep -oP 'tick virt.*?nodoMax.*?proc=\\d+ms' /opt/tomcat11/logs/catalina.out | tail -3", timeout=10))

# Check catalina for VENTANA logs
print("\n=== LAST 3 VENTANA LOGS ===")
print(run(f"echo {PW} | sudo -S grep -oP 'VENTANA.*' /opt/tomcat11/logs/catalina.out | tail -3", timeout=10))

# Check catalina for planificacion ventana summary
print("\n=== LAST 3 PLANIFICACION LOGS ===")
print(run(f"echo {PW} | sudo -S grep -oP 'Sesion.*planificacion ventana.*enrutados en.*' /opt/tomcat11/logs/catalina.out | tail -3", timeout=10))

client.close()
