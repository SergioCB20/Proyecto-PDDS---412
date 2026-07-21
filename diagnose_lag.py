#!/usr/bin/env python3
"""Diagnóstico remoto para investigar lag de simulación 5529f055."""
import paramiko, sys

HOST = '1inf54-983-4d.inf.pucp.edu.pe'
USER = '1inf54.983.4d'
PW = 'Bw39q25X'
DB = 'tasfb2b_db'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PW, timeout=10)

def run(cmd, timeout=20):
    try:
        chan = client.get_transport().open_session()
        chan.settimeout(timeout)
        chan.get_pty()
        chan.exec_command(cmd)
        return chan.makefile('r', -1).read()
    except Exception as e:
        return f"[TIMEOUT/ERROR: {type(e).__name__}: {e}]"

def section(title):
    print(f"\n{'='*60}\n  {title}\n{'='*60}")

# --- Sesión específica 5529f055 ---
section("Sesión 5529f055 (o prefijo)")
print(run(f"""echo {PW} | sudo -S -u postgres psql -d {DB} -c "
SELECT id, estado, tipo, fecha_inicio_virtual, hora_inicio_virtual,
       dia_hora_virtual, segundos_reales_transcurridos,
       fecha_creacion, fecha_inicio_real, fecha_fin_real,
       k, sa_segundos, duracion_dias, fecha_alineada_a
FROM sesiones_ejecucion
WHERE id::text LIKE '5529f055%';" 2>&1""", timeout=10))

section("Sesiones EN_CURSO/PAUSADA/COLAPSADA")
print(run(f"""echo {PW} | sudo -S -u postgres psql -d {DB} -c "
SELECT id, estado, dia_hora_virtual, segundos_reales_transcurridos,
       EXTRACT(EPOCH FROM (now() - COALESCE(fecha_inicio_real, fecha_creacion))) AS secs_real_live
FROM sesiones_ejecucion
WHERE estado IN ('EN_CURSO','PAUSADA','COLAPSADA')
ORDER BY fecha_creacion DESC;" 2>&1""", timeout=10))

section("Vuelos instanciados por fecha (últimas 8)")
print(run(f"""echo {PW} | sudo -S -u postgres psql -d {DB} -c "
SELECT fecha_operacion, count(*) AS total,
       sum(CASE WHEN estado='PROGRAMADO' THEN 1 ELSE 0 END) AS prog,
       sum(CASE WHEN estado='EN_RUTA' THEN 1 ELSE 0 END) AS en_ruta,
       sum(CASE WHEN estado='COMPLETADO' THEN 1 ELSE 0 END) AS comp
FROM vuelos WHERE NOT es_plantilla
GROUP BY fecha_operacion ORDER BY fecha_operacion DESC LIMIT 8;" 2>&1""", timeout=10))

section("Ocupación por nodo (sesión 5529f055)")
print(run(f"""echo {PW} | sudo -S -u postgres psql -d {DB} -c "
SELECT n.codigo_iata, o.ocupacion, n.capacidad_almacen,
       round((o.ocupacion*100.0/n.capacidad_almacen)::numeric, 2) AS pct
FROM ocupacion_nodo o
JOIN nodos_logisticos n ON n.id = o.nodo_id
WHERE o.sesion_id::text LIKE '5529f055%'
ORDER BY pct DESC LIMIT 15;" 2>&1""", timeout=10))

section("Equipajes por estado (sesión 5529f055)")
print(run(f"""echo {PW} | sudo -S -u postgres psql -d {DB} -c "
SELECT e.estado, count(*)
FROM equipajes e
JOIN planes_viaje p ON p.equipaje_id = e.id
WHERE p.sesion_id::text LIKE '5529f055%'
GROUP BY e.estado ORDER BY e.estado;" 2>&1""", timeout=10))

section("Tickets Redis: estado sesión / metricas")
print(run(f"""echo {PW} | sudo -S redis-cli GET "tasfb2b:sesion:5529f055*" 2>&1 || echo 'no redis'""", timeout=5))
print(run(f"""echo {PW} | sudo -S redis-cli KEYS "tasfb2b:sesion:*" 2>&1 | head -10""", timeout=5))
print(run(f"""echo {PW} | sudo -S redis-cli GET "tasfb2b:metricas:5529f055*" 2>&1 | head -50 || echo 'no redis'""", timeout=5))

section("Tomcat process / port 8080")
print(run(f"""echo {PW} | sudo -S ss -tlnp | grep 8080 || echo 'NOT LISTENING'""", timeout=5))
print(run(f"""echo {PW} | sudo -S ps aux | grep -E 'tomcat|java' | grep -v grep | head -5""", timeout=5))

section("Catalina tail (last 80)")
print(run(f"""echo {PW} | sudo -S tail -80 /opt/tomcat11/logs/catalina.out 2>&1 | tail -80""", timeout=10))

client.close()
print("\nDiagnóstico completado.")
