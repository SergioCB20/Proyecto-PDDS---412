#!/usr/bin/env python3
"""
Diagnóstico de sesión de simulación TAS FB2B.
Uso: python diagnose_sesion.py <session_id>
"""
import paramiko, sys, json

SID = sys.argv[1] if len(sys.argv) > 1 else 'e609a2b8'
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
    import base64
    b64 = base64.b64encode(q.encode()).decode()
    return run(f"echo {PW} | sudo -S -u postgres sh -c \"echo '{b64}' | base64 -d | psql -d {DB}\" 2>&1", timeout=30)

def section(t):
    print(f"\n{'='*60}\n  {t}\n{'='*60}")

section(f"Sesión {SID} — encontrar full UUID")
id_res = sql(f"SELECT id::text FROM sesiones_ejecucion WHERE id::text LIKE '{SID}%' LIMIT 5")
print(id_res)
# extract full UUID from result
import re
match = re.search(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', str(id_res))
FULL = match.group(1) if match else SID
print(f"\nFull UUID: {FULL}")

section(f"Sesión {FULL} — datos generales")
print(sql(f"SELECT id::text, estado, dia_hora_virtual, fecha_alineada_a, tipo_simulacion, tipo, sa_segundos, k, sla_acumulado_pct, segundos_reales_transcurridos FROM sesiones_ejecucion WHERE id = '{FULL}'"))

section(f"Ocupación nodos para sesión")
print(sql(f"SELECT n.codigo_iata, o.ocupacion, n.capacidad_almacen, round((o.ocupacion::numeric / nullif(n.capacidad_almacen,0))*100,1) as pct FROM ocupacion_nodo o JOIN nodos_logisticos n ON n.id = o.nodo_id WHERE o.sesion_id = '{FULL}' ORDER BY o.ocupacion DESC LIMIT 10"))

section(f"Vuelos PROGRAMADO (no plantilla)")
print(sql(f"SELECT count(*) FROM vuelos WHERE estado = 'PROGRAMADO' AND es_plantilla = false"))

section(f"Vuelos EN_RUTA (no plantilla)")
print(sql(f"SELECT count(*) FROM vuelos WHERE estado = 'EN_RUTA' AND es_plantilla = false"))

section(f"ocupacion_nodo table schema + constraints")
print(sql(f"\\d ocupacion_nodo"))

section(f"ocupacion_nodo row count for ANY session")
print(sql(f"SELECT count(distinct sesion_id) as sesiones, count(*) as total_rows FROM ocupacion_nodo"))

section(f"Session log tail (grep catalina.out)")
print(run(f"echo {PW} | sudo -S tail -5 /opt/tomcat11/logs/catalina.out", timeout=10))

section(f"Last 10 planifier runs for this session")
print(run(f"echo {PW} | sudo -S grep -i '{FULL[:8]}' /opt/tomcat11/logs/catalina.out | grep -i 'planificacion ventana\|SinRuta\|Backlog\|COLAPSO' | tail -10", timeout=10))

section(f"Last 5 tick logs for this session")
print(run(f"echo {PW} | sudo -S grep -i '{FULL[:8]}' /opt/tomcat11/logs/catalina.out | grep -i 'tick virt' | tail -5", timeout=10))

section(f"Últimas líneas log de la sesión en catalina.out")
print(run(f"echo {PW} | sudo -S grep -i '{SID[:8]}' /opt/tomcat11/logs/catalina.out | tail -30", timeout=10))

client.close()
print("\n✅ Diagnóstico completado.")
