import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('1inf54-983-4d.inf.pucp.edu.pe', username='1inf54.983.4d', password='Bw39q25X', timeout=10)
PW = 'Bw39q25X'

def run(cmd, timeout=30):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    out = chan.makefile('r', -1).read()
    return out

# Full flow for session 8409630a from catalina.out
print("=== FULL flow for session 8409630a ===")
print(run(f"echo {PW} | sudo -S grep -E '8409630a|Preparacion|marcarLista|estaLista' /opt/tomcat11/logs/catalina.out | tail -40", timeout=30))

# Also check: what's happening right NOW
print("\n=== Last 20 lines of catalina.out ===")
print(run(f"echo {PW} | sudo -S tail -20 /opt/tomcat11/logs/catalina.out", timeout=15))

# Check session status in DB
print("\n=== Session status ===")
print(run(f'echo {PW} | sudo -S -u postgres psql -d tasfb2b -c "SELECT id::text, estado, dia_hora_virtual, fecha_alineada_a, k, tipo FROM sesiones_ejecucion ORDER BY fecha_creacion DESC LIMIT 5;" 2>/dev/null', timeout=10))

# Check counts
print("\n=== Flight instance counts by date ===")
print(run(f'echo {PW} | sudo -S -u postgres psql -d tasfb2b -c "SELECT fecha_operacion, COUNT(*) FROM vuelos WHERE NOT es_plantilla GROUP BY fecha_operacion ORDER BY fecha_operacion LIMIT 10;" 2>/dev/null', timeout=10))

client.close()
