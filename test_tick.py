import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('1inf54-983-4d.inf.pucp.edu.pe', username='1inf54.983.4d', password='Bw39q25X', timeout=10)

PW = 'Bw39q25X'

def run(cmd, timeout=15):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    out = chan.makefile('r', -1).read()
    return out

# Check current time
print("=== Current time on server ===")
print(run("date", timeout=5))

# Grep today's log for all app-related lines (tick, planificador, telemetria, sesion, error, simula, equipaje, envio, metric as, nodo, vuelo)
print("\n=== Tick and simulation logs today ===")
print(run(f"echo {PW} | sudo -S grep -iE 'TickService|procesarTick|Planificador|planificar|Telemetria|sesion.*EN_CURSO|dia_hora_virtual|Equipaje.*Entrega|enrut.*Ventana|Marca.*Lista|readiness|preparar|Preparacion' /opt/tomcat11/logs/catalina.2026-06-16.log | head -100", timeout=10))

# Also check for any errors or exceptions
print("\n=== Recent errors ===")
print(run(f"echo {PW} | sudo -S grep -iE 'ERROR|Exception|error|WARN' /opt/tomcat11/logs/catalina.2026-06-16.log | grep -v 'Redis.*disponible' | tail -40", timeout=10))

client.close()
