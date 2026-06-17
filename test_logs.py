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

# The real logs are in catalina.out
run(f"echo {PW} | sudo -S wc -l /opt/tomcat11/logs/catalina.out", timeout=5)
run(f"echo {PW} | sudo -S ls -la /opt/tomcat11/logs/ | head -20", timeout=5)
run(f"echo {PW} | sudo -S tail -200 /opt/tomcat11/logs/catalina.out | grep -iE 'Preparacion|clonando|marcarLista|readiness|error|Exception|Started|CargaSimulacion|cargarTodos|equipaje' | tail -20", timeout=5)
run(f"echo {PW} | sudo -S tail -100 /opt/tomcat11/logs/catalina.2026-06-16.log 2>/dev/null | grep -iE 'Preparacion|clonando|marcarLista|readiness|error|Exception|Started' | tail -20", timeout=5)

# Check the most recent catalina log
run(f"echo {PW} | sudo -S ls -lt /opt/tomcat11/logs/catalina*.log 2>/dev/null | head -5", timeout=5)

client.close()
