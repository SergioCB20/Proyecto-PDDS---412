#!/usr/bin/env python3
"""
Diagnóstico focalizado de una sesión de simulación.
Uso: python diagnose_sesion.py <session_id_prefix>
Ej:  python diagnose_sesion.py 6c9525cb
"""
import paramiko, sys, re

if len(sys.argv) < 2:
    print("uso: diagnose_sesion.py <session_id_prefix>")
    sys.exit(1)

SES = sys.argv[1].strip().lower()
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
    return chan.makefile('r', -1).read()

def section(t):
    print(f"\n{'='*64}\n  {t}\n{'='*64}")

section(f"Sesion que matchea prefijo '{SES}'")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \""
    f"SELECT id::text, estado, tipo, tipo_simulacion, k, sa_segundos, "
    f"ventana_horas, fecha_inicio_virtual, hora_inicio_virtual, "
    f"fecha_alineada_a, fecha_inicio_real, segundos_reales_transcurridos, "
    f"dia_hora_virtual, vuelos_cancelados, maletas_replanificadas, sla_acumulado_pct, "
    f"created_at FROM sesiones_ejecucion WHERE id::text LIKE '{SES}%';\" 2>&1", timeout=10))

section("Conteos por tabla para esta sesion")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \""
    f"SELECT 'planes_viaje' AS tabla, COUNT(*) FROM planes_viaje WHERE sesion_id::text LIKE '{SES}%' "
    f"UNION ALL SELECT 'segmentos_plan', COUNT(*) FROM segmentos_plan sp "
    f"JOIN planes_viaje pv ON pv.id = sp.plan_viaje_id WHERE pv.sesion_id::text LIKE '{SES}%' "
    f"UNION ALL SELECT 'puntos_sla', COUNT(*) FROM puntos_sla ps "
    f"JOIN reportes_sesion rs ON rs.id = ps.reporte_id WHERE rs.sesion_id::text LIKE '{SES}%';\" 2>&1", timeout=15))

section("Equipajes por estado (acotado a REGISTRADO para esta fecha virtual)")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \""
    f"SELECT estado, COUNT(*) FROM equipajes WHERE estado IN ('REGISTRADO','ENRUTADO','EN_ALMACEN','EN_VUELO','ENTREGADO') "
    f"GROUP BY estado ORDER BY estado;\" 2>&1", timeout=60))

section("Backlog REGISTRADO para planificador")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \""
    f"SELECT COUNT(*) FROM equipajes WHERE estado='REGISTRADO';\" 2>&1", timeout=60))

section("Vuelos por estado y rango de fecha (plantillas vs instancias)")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \""
    f"SELECT es_plantilla, estado, COUNT(*) FROM vuelos "
    f"GROUP BY es_plantilla, estado ORDER BY es_plantilla, estado;\" 2>&1", timeout=10))

section("Vuelos instanciados por fecha_operacion (ultimas 6)")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \""
    f"SELECT fecha_operacion, estado, COUNT(*) FROM vuelos WHERE es_plantilla=false "
    f"GROUP BY fecha_operacion, estado ORDER BY fecha_operacion DESC LIMIT 12;\" 2>&1", timeout=10))

section("Ocupacion nodos para esta sesion (top 10)")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \""
    f"SELECT n.codigo_iata, o.ocupacion, n.capacidad_almacen, "
    f"ROUND(100.0*o.ocupacion/GREATEST(n.capacidad_almacen,1),1) AS pct "
    f"FROM ocupacion_nodo o JOIN nodos_logisticos n ON n.id = o.nodo_id "
    f"WHERE o.sesion_id::text LIKE '{SES}%' ORDER BY pct DESC LIMIT 10;\" 2>&1", timeout=10))

section("Consultas activas lentas (>30s)")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \""
    f"SELECT pid, now()-xact_start AS xact_age, state, query "
    f"FROM pg_stat_activity WHERE state IN ('active','idle in transaction') "
    f"AND (now()-xact_start) > interval '30 seconds' OR query_start < now() - interval '30 seconds';\" 2>&1", timeout=10))

section("Bloqueos / locks")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \""
    f"SELECT relation::regclass, mode, granted, COUNT(*) "
    f"FROM pg_locks GROUP BY relation, mode, granted ORDER BY 4 DESC LIMIT 15;\" 2>&1", timeout=10))

section("Indices en tablas criticas")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \""
    f"SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes "
    f"WHERE tablename IN ('equipajes','vuelos','segmentos_plan','planes_viaje','ocupacion_nodo') "
    f"ORDER BY tablename, indexname;\" 2>&1", timeout=10))

section("Logs de planificacion recientes (sesion)")
LOG = "/opt/tomcat11/logs/catalina.out"
print(run(f"echo {PW} | sudo -S grep -F {SES} {LOG} 2>&1 | grep -E 'planificacion ventana|Ta>|preparacion|ARRANQUE|PREPARACION|TickService.*ARRANQUE|enrutarVentana|PREPARACION async' | tail -60", timeout=15))

section("Logs de tick recientes (sesion)")
print(run(f"echo {PW} | sudo -S grep -F {SES} {LOG} 2>&1 | grep -E 'tick virt=|DESPEGA|CANCELA|Ta>|COLAPSO' | tail -30", timeout=15))

section("Errores recientes (sin filtro estricto de sesion)")
print(run(f"echo {PW} | sudo -S grep -E 'ERROR|Exception|StaleObject|Could not extract|deadlock' "
    f"{LOG} 2>&1 | tail -60", timeout=10))

section("Frontend + backend procesos")
print(run(f"echo {PW} | sudo -S ps -eo pid,etime,pcpu,pmem,rss,comm --sort=-pcpu | head -20", timeout=5))
print(run(f"echo {PW} | sudo -S ss -tlnp 2>&1 | grep -E ':8080|:5000|tomcat' || true", timeout=5))

client.close()
print("\n[OK] Diagnostico de sesion completado.")
