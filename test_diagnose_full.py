import paramiko, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('1inf54-983-4d.inf.pucp.edu.pe', username='1inf54.983.4d', password='Bw39q25X', timeout=10)
PW = 'Bw39q25X'

def run(cmd, timeout=30):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    return chan.makefile('r', -1).read()

# 1. Check deploy status
print("=== WAR timestamp ===")
print(run(f"echo {PW} | sudo -S ls -la /opt/tomcat11/webapps/ROOT.war", timeout=5))

# 2. Check if new code is in the class
print("\n=== New TickService code? (ultimaFechaClonada) ===")
print(run(f"echo {PW} | sudo -S grep -c 'existenInstanciasParaFecha' /opt/tomcat11/webapps/ROOT/WEB-INF/classes/com/tasfb2b/backend/bc1/application/VueloService.class 2>/dev/null || echo 'NOT FOUND'", timeout=10))

print("\n=== scheduler pool size in props ===")
print(run(f"echo {PW} | sudo -S grep -c 'task.scheduling.pool.size' /opt/tomcat11/webapps/ROOT/WEB-INF/classes/application.properties 2>/dev/null || echo 'NOT FOUND'", timeout=10))

# 3. Check Tomcat process (PID and uptime)
print("\n=== Tomcat process ===")
print(run(f"echo {PW} | sudo -S ps aux | grep '[t]omcat' | awk '{{print $2, $9}}'", timeout=5))

# 4. Latest session data from DB
print("\n=== Sessions in DB ===")
print(run(f'echo {PW} | sudo -S -u postgres psql -d tasfb2b -c "SELECT id::text, estado, dia_hora_virtual, fecha_alineada_a, k, fecha_inicio_real::text FROM sesiones_ejecucion ORDER BY fecha_creacion DESC LIMIT 5;" 2>/dev/null', timeout=10))

# 5. Latest app logs about this session
print("\n=== Recent app logs (last 40 lines from catalina.out) ===")
print(run(f"echo {PW} | sudo -S tail -40 /opt/tomcat11/logs/catalina.out", timeout=15))

client.close()
