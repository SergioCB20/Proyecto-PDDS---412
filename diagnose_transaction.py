#!/usr/bin/env python3
"""Focus on planifier transaction behavior"""
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

# Check catalina.out for ALL planifier-related logs (small grep with context)
# Limit to last 10 lines mentioning this session to avoid timeout
print("=== CATALINA FRESH TAIL (last 20 lines) ===")
print(run(f"echo {PW} | sudo -S tail -20 /opt/tomcat11/logs/catalina.out", timeout=10))

# Check for the VENTANA log specifically (it shows enrutarVentana execution)
print("\n=== VENTANA LOGS (last 5) ===")
print(run(f"echo {PW} | sudo -S grep -F 'VENTANA' /opt/tomcat11/logs/catalina.out | tail -5", timeout=15))

# Check for planificacion summary logs
print("\n=== PLANIFICACION LOGS (last 5) ===")
print(run(f"echo {PW} | sudo -S grep -F 'planificacion ventana' /opt/tomcat11/logs/catalina.out | tail -5", timeout=15))

# Check for error logs
print("\n=== ERROR LOGS (last 5) ===")
print(run(f"echo {PW} | sudo -S grep -i 'ERROR\|Exception\|rollback\|Rollback' /opt/tomcat11/logs/catalina.out | tail -5", timeout=15))

# Check planes_viaje for ALL sessions + count
print("\n=== PLANES VIAJE (any session) ===")
print(run(f"echo {PW} | sudo -S -u postgres sh -c \"psql -d {DB} -c 'SELECT sesion_id::text, COUNT(*) FROM planes_viaje GROUP BY sesion_id ORDER BY COUNT DESC LIMIT 5;'\" 2>&1", timeout=30))

# Check how many equipajes ARE REGISTRADO (small sub-count using index)
print("\n=== REGISTRADO count (first 1000) ===")
print(run(f"echo {PW} | sudo -S -u postgres sh -c \"psql -d {DB} -c 'SELECT estado, COUNT(*) FROM equipajes WHERE estado IN (\\'REGISTRADO\\', \\'ENRUTADO\\') GROUP BY estado;'\" 2>&1", timeout=120))

client.close()
