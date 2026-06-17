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
    print(out)

# Check today's catalina log (67KB - fast to read full)
run(f"echo {PW} | sudo -S grep -iE 'Preparacion|clonando|marcarLista|readiness|error|Exception|Started Backend|sesion|TaskExecutor|CargaSimulacion' /opt/tomcat11/logs/catalina.2026-06-16.log | tail -40", timeout=10)

# Also check last 60 lines of today's log
run(f"echo {PW} | sudo -S tail -60 /opt/tomcat11/logs/catalina.2026-06-16.log", timeout=10)

# Check last 30 lines of catalina.out for any recent activity
run(f"echo {PW} | sudo -S tail -30 /opt/tomcat11/logs/catalina.out", timeout=10)

# Check if the app is running and what ports
run(f"echo {PW} | sudo -S ss -tlnp | grep -E '8080|5000'", timeout=5)

client.close()
