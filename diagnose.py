#!/usr/bin/env python3
import paramiko, sys, time
HOST = '1inf54-983-4d.inf.pucp.edu.pe'
USER = '1inf54.983.4d'
PW = 'Bw39q25X'
DB = 'tasfb2b_db'
SESION = 'b2c40351-5ec6-4efb-853a-61a70f61437e'
SID8 = 'b2c40351'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PW, timeout=10)

def run(cmd, timeout=30):
    for attempt in range(2):
        try:
            chan = client.get_transport().open_session()
            chan.settimeout(timeout)
            chan.get_pty()
            chan.exec_command(cmd)
            out = chan.makefile('r', -1).read()
            return out
        except Exception as e:
            if attempt == 0:
                time.sleep(2)
                continue
            return f"TIMEOUT/ERROR: {e}\n"
    return ""

def pq(query, timeout=30):
    return run(f"echo {PW} | sudo -S -u postgres psql -t -A -d {DB} -c \"{query}\" 2>&1", timeout)

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

section("Session b2c40351")
print(pq("SELECT id::text, estado, dia_hora_virtual, fecha_alineada_a, tipo FROM sesiones_ejecucion WHERE id = '"+SESION+"'::uuid"))

section("Equipaje global count (fast)")
print(pq("SELECT COUNT(*) FROM equipajes"))

section("Equipaje by estado (simplified)")
for estado in ['REGISTRADO','ENRUTADO','EN_ALMACEN','EN_VUELO','ENTREGADO']:
    cnt = pq("SELECT COUNT(*) FROM equipajes WHERE estado='"+estado+"'")
    print(f"  {estado}: {cnt.strip()}")

section("b2c40351 planes_viaje count")
print(pq("SELECT count(*) FROM planes_viaje WHERE sesion_id = '"+SESION+"'::uuid"))

section("b2c40351 equipajes in planes_viaje count")
print(pq("SELECT COUNT(DISTINCT e.id) FROM equipajes e JOIN planes_viaje pv ON pv.equipaje_id = e.id WHERE pv.sesion_id = '"+SESION+"'::uuid"))

section("b2c40351 plan/log")
print(run(f"echo {PW} | sudo -S grep '{SID8}' /opt/tomcat11/logs/catalina.out | grep -E 'ventana|planif|enrut|backlog|SinRuta' | tail -10", 15))

section("b2c40351 tick")
print(run(f"echo {PW} | sudo -S grep '{SID8}' /opt/tomcat11/logs/catalina.out | grep 'tick virt' | tail -3", 15))

section("Envios files")
print(run(f"echo {PW} | sudo -S ls -la /opt/tomcat11/data/_envios_*.txt 2>&1", 10))
print(run(f"echo {PW} | sudo -S wc -l /opt/tomcat11/data/_envios_*.txt 2>&1", 30))

section("Carga/seed logs")
print(run(f"echo {PW} | sudo -S grep -i -E 'carga|seed|envio' /opt/tomcat11/logs/catalina.out | tail -10", 15))

section("Fecha op count by month (top 5)")
print(pq("SELECT to_char(fecha_operacion, 'YYYY-MM') as mes, count(*) FROM equipajes GROUP BY mes ORDER BY mes LIMIT 20"))

section("Fecha op count around sim date")
print(pq("SELECT fecha_operacion::date as dia, count(*) FROM equipajes WHERE fecha_operacion >= '2027-08-01' AND fecha_operacion < '2027-08-15' GROUP BY dia ORDER BY dia"))

section("Total REGISTRADO vs processed by planificador")
print(pq("SELECT (SELECT count(*) FROM equipajes WHERE estado='REGISTRADO') as registrados, (SELECT count(*) FROM planes_viaje) as total_planes"))

section("All plan logs (case-insensitive)")
print(run(f"echo {PW} | sudo -S grep -i '{SID8}' /opt/tomcat11/logs/catalina.out | grep -i -E 'ventana|backlog|enrut|sinruta' | tail -15", 15))

section("Ultima planificacion endpoint")
print(run("curl -s http://localhost:8080/api/sesiones/"+SESION+"/ultima-planificacion 2>&1 | head -5", 10))

section("All equipaje estado counts")
print(pq("SELECT estado, COUNT(*) FROM equipajes GROUP BY estado ORDER BY estado"))

client.close()
print("\nDone")
