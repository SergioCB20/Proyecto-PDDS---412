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

# Use tail to limit scope - last 2000 lines should cover the session
print("=== Preparacion and readiness logs from tail ===")
print(run(f"echo {PW} | sudo -S tail -5000 /opt/tomcat11/logs/catalina.out | grep -E '8409630a|Preparacion|marcarLista|estaLista|readiness' | head -30", timeout=60))

# Session status from DB
print("\n=== Session status ===")
print(run(f'echo {PW} | sudo -S -u postgres psql -d tasfb2b -c "SELECT id::text, estado, dia_hora_virtual, fecha_alineada_a, k, tipo FROM sesiones_ejecucion ORDER BY fecha_creacion DESC LIMIT 5;" 2>/dev/null', timeout=10))

# Check flight instance counts
print("\n=== Vuelo instances by date ===")
print(run(f'echo {PW} | sudo -S -u postgres psql -d tasfb2b -c "SELECT fecha_operacion, COUNT(*) FROM vuelos WHERE NOT es_plantilla GROUP BY fecha_operacion ORDER BY fecha_operacion LIMIT 15;" 2>/dev/null', timeout=10))

# Check equipaje count
print("\n=== Equipaje count ===")
print(run(f'echo {PW} | sudo -S -u postgres psql -d tasfb2b -c "SELECT COUNT(*) FROM equipajes;" 2>/dev/null', timeout=10))

client.close()
