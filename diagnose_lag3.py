#!/usr/bin/env python3
"""Trace tick cadence precisely."""
import paramiko, re

HOST = '1inf54-983-4d.inf.pucp.edu.pe'
USER = '1inf54.983.4d'
PW = 'Bw39q25X'
DB = 'tasfb2b_db'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PW, timeout=10)

def run(cmd, timeout=60):
    try:
        chan = client.get_transport().open_session()
        chan.settimeout(timeout)
        chan.get_pty()
        chan.exec_command(cmd)
        return chan.makefile('r', -1).read()
    except Exception as e:
        return f"[TIMEOUT/ERROR: {type(e).__name__}: {e}]"

print("=== Busca ticks de 5529f055 (start_window=08:30:00..08:39:30) ===")
print(run(f"""echo {PW} | sudo -S bash -c "grep '\\[SIM 5529f055.*\\(\\(tick virt\\)\\|\\(DESPEGA\\)\\|\\(ATERRIZA\\)\\)' /opt/tomcat11/logs/catalina.out | awk '{{print $1}}' | head -120" 2>&1""", timeout=15))

print("\n=== Compare timestamps: every 'tick virt' line + every DESPEGA cluster start ===")
print(run(f"""echo {PW} | sudo -S bash -c "grep -E '\\[SIM 5529f055.*tick virt' /opt/tomcat11/logs/catalina.out | awk -F'T' '{{print $1, $2}}' | sed 's/-05:00//' | head -120" 2>&1""", timeout=15))

print("\n=== All log lines 08:30:00 to 08:34:00 (compact) ===")
print(run(f"""echo {PW} | sudo -S bash -c "sed -n '/^2026-07-21T08:30:/,/^2026-07-21T08:34:/p' /opt/tomcat11/logs/catalina.out | grep -E 'SIM 5529f055|TickService|EnrutamientoService|Preparacion|Grafo|ACO|planificacion|TICK|cancelaci|RESET' | head -60" 2>&1""", timeout=15))

print("\n=== List ALL ticks (full text, first 30) ===")
print(run(f"""echo {PW} | sudo -S bash -c "grep -E '\\[SIM 5529f055.*tick virt' /opt/tomcat11/logs/catalina.out | head -30" 2>&1""", timeout=15))

cmd = f"""echo {PW} | sudo -S bash -c "grep -oE 'proc=[0-9]+ms' /opt/tomcat11/logs/catalina.out | grep -oE '[0-9]+' | sort -n | head -50" 2>&1"""
print("\n=== Proc times first 50 (ms) ===")
print(run(cmd, timeout=15))

cmd2 = f"""echo {PW} | sudo -S bash -c "grep -oE 'proc=[0-9]+ms' /opt/tomcat11/logs/catalina.out | grep -oE '[0-9]+' | sort -n | awk 'BEGIN{{c=0;s=0;mx=0;}} {{c++;s+=\\$1;if(\\$1>mx)mx=\\$1;}} END{{print \"count=\"c, \"sum=\"s, \"avg=\"s/c, \"max=\"mx}}'" 2>&1"""
print("\n=== Tick proc stats ===")
print(run(cmd2, timeout=15))

client.close()
print("\nfin.")
