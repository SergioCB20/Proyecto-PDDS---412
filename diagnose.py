#!/usr/bin/env python3
"""
Diagnóstico remoto del servidor TAS FB2B.
Uso: python diagnose.py

Requiere: pip install paramiko
"""
import paramiko, sys

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
    return chan.makefile('r', -1).read()

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

section("Tomcat status")
print(run(f"echo {PW} | sudo -S systemctl status tomcat11 2>&1 | head -12", timeout=5))

section("Port 8080 (backend)")
print(run(f"echo {PW} | sudo -S ss -tlnp | grep 8080 || echo 'NOT LISTENING'", timeout=5))

section("Port 5000 (frontend)")
print(run(f"echo {PW} | sudo -S ss -tlnp | grep 5000 || echo 'NOT LISTENING'", timeout=5))

section("Health endpoint")
print(run("curl -s http://localhost:8080/health 2>&1 || echo 'No response'", timeout=5))

section("Flyway migrations")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT version, description, success FROM flyway_schema_history ORDER BY version;\" 2>&1", timeout=10))

section("Active sessions")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT id::text, estado, dia_hora_virtual, fecha_alineada_a, tipo FROM sesiones_ejecucion ORDER BY fecha_creacion DESC LIMIT 5;\" 2>&1", timeout=10))

section("Plantillas (total vs unique)")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT count(*) as total, count(distinct codigo_vuelo) as distinct_count FROM vuelos WHERE es_plantilla = true;\" 2>&1", timeout=10))

section("Vuelos instanciados por fecha")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT fecha_operacion, count(*) FROM vuelos WHERE not es_plantilla GROUP BY fecha_operacion ORDER BY fecha_operacion LIMIT 5;\" 2>&1", timeout=10))

section("Equipajes total")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT count(*) FROM equipajes;\" 2>&1", timeout=10))

section("Recent app logs")
print(run(f"echo {PW} | sudo -S tail -20 /opt/tomcat11/logs/catalina.out", timeout=10))

client.close()
print("\n✅ Diagnóstico completado.")
