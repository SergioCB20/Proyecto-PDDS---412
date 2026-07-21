#!/usr/bin/env python3
"""Drill into lag observation: check session start, preparation, and tick timings."""
import paramiko

HOST = '1inf54-983-4d.inf.pucp.edu.pe'
USER = '1inf54.983.4d'
PW = 'Bw39q25X'
DB = 'tasfb2b_db'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PW, timeout=10)

def run(cmd, timeout=30):
    try:
        chan = client.get_transport().open_session()
        chan.settimeout(timeout)
        chan.get_pty()
        chan.exec_command(cmd)
        return chan.makefile('r', -1).read()
    except Exception as e:
        return f"[TIMEOUT/ERROR: {type(e).__name__}: {e}]"

def section(t):
    print(f"\n{'='*60}\n  {t}\n{'='*60}")

section("Sesión 5529f055 estados y start")
print(run(f"""echo {PW} | sudo -S -u postgres psql -d {DB} -c "
SELECT id::text, estado, fecha_inicio_virtual, hora_inicio_virtual,
       dia_hora_virtual, segundos_reales_transcurridos,
       fecha_inicio_real, fecha_fin_real,
       k, sa_segundos
FROM sesiones_ejecucion WHERE id::text LIKE '5529f055%';" 2>&1""", timeout=10))

section("Cuántos ticks se 'saltearon' (no-agregado via log 'tick virt=...')")
print(run(f"""echo {PW} | sudo -S bash -c "grep -c '\\[SIM 5529f055.*tick virt' /opt/tomcat11/logs/catalina.out" 2>&1""", timeout=10))
print(run(f"""echo {PW} | sudo -S bash -c "grep -c 'Planificador ocupado' /opt/tomcat11/logs/catalina.out" 2>&1""", timeout=10))

section("Tick proc times (first 60 / line distrib)")
print(run(f"""echo {PW} | sudo -S bash -c "grep -oE 'proc=[0-9]+ms' /opt/tomcat11/logs/catalina.out | sort | uniq -c | sort -rn | head -10" 2>&1""", timeout=10))

section("Tick advance distribution (+{x}m)")
print(run(f"""echo {PW} | sudo -S bash -c "grep -oE '\\+[0-9]+m\\)' /opt/tomcat11/logs/catalina.out | sort | uniq -c | sort -rn | head -10" 2>&1""", timeout=10))

section("Busca ARRANQUE / Preparacion / start")
print(run(f"""echo {PW} | sudo -S bash -c "grep -E 'ARRANQUE sesion|Preparacion async (iniciada|completada)|reset|iniciada sesion|Iniciada sesion' /opt/tomcat11/logs/catalina.out | tail -30" 2>&1""", timeout=10))

section("Mark first 30 ticks (start to virt=12:00)")
print(run(f"""echo {PW} | sudo -S bash -c "grep '\\[SIM 5529f055.*\\+10m\\|\\+30m\\|\\+1h0\\|\\+15m\\|\\+1h' /opt/tomcat11/logs/catalina.out | head -40" 2>&1""", timeout=10))

section("First 'tick virt' log line y first 'ARRANQUE' or 'Preparacion'")
print(run(f"""echo {PW} | sudo -S bash -c "grep -n -E '\\[SIM 5529f055.*tick virt|Preparacion async.*5529f055|ARRANQUE sesion tipo' /opt/tomcat11/logs/catalina.out" 2>&1 | head -10""", timeout=10))

section("Spring scheduled invocations count")
print(run(f"""echo {PW} | sudo -S bash -c "wc -l /opt/tomcat11/logs/catalina.out" 2>&1""", timeout=10))

section("Recent GC logs / OOM")
print(run(f"""echo {PW} | sudo -S bash -c "grep -iE 'OutOfMemory|GC pause|Error' /opt/tomcat11/logs/catalina.out | tail -20" 2>&1""", timeout=10))

client.close()
print("\nfin.")
