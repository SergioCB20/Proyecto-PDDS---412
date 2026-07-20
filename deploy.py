import paramiko
import time

HOST = '1inf54-983-4d.inf.pucp.edu.pe'
USER = '1inf54.983.4d'
PW = 'Bw39q25X'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PW, timeout=15)

def run(cmd, timeout=120):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    chan.shutdown_write()
    out = b''
    while not chan.exit_status_ready():
        try:
            chunk = chan.recv(4096)
            if not chunk:
                break
            out += chunk
        except:
            break
    remaining = chan.recv(4096)
    while remaining:
        out += remaining
        remaining = chan.recv(4096)
    return out.decode('latin-1', errors='replace')

pw = PW
WAR_PATH = r'C:\Users\a2020\Documents\2026-1\PDDS\proyecto\backend\backend\target\backend-0.0.1-SNAPSHOT.war'

# 1. Upload WAR
print("=== Subiendo WAR al servidor... ===")
sftp = client.open_sftp()
sftp.put(WAR_PATH, '/home/1inf54.983.4d/backend.war')
sftp.close()
print("WAR subido.")

# 2. Stop Tomcat
print("=== Deteniendo Tomcat... ===")
print(run(f"echo {pw} | sudo -S systemctl stop tomcat11 2>&1 || echo 'no systemctl, intentando shutdown...'"))
time.sleep(3)

# 3. Check if Tomcat stopped
print("=== Verificando proceso Tomcat... ===")
print(run(f"echo {pw} | sudo -S ps aux | grep '[t]omcat' || echo 'no process found'"))

# 4. Backup and copy WAR
print("=== Copiando WAR a webapps... ===")
print(run(f"echo {pw} | sudo -S cp /opt/tomcat11/webapps/ROOT.war /opt/tomcat11/webapps/ROOT.war.bak 2>&1 || echo 'no backup needed'"))
print(run(f"echo {pw} | sudo -S cp /home/1inf54.983.4d/backend.war /opt/tomcat11/webapps/ROOT.war 2>&1"))
print(run(f"echo {pw} | sudo -S rm -rf /opt/tomcat11/webapps/ROOT 2>&1"))
print("WAR copiado.")

# 5. Start Tomcat
print("=== Iniciando Tomcat... ===")
print(run(f"echo {pw} | sudo -S systemctl start tomcat11 2>&1 || echo 'no systemctl, iniciando manualmente...'"))

# 6. Wait for deploy
print("Esperando 60s para deploy...")
time.sleep(60)

# 7. Verify health
print("=== Verificando health... ===")
print(run(f"echo {pw} | sudo -S curl -s http://localhost:8080/health 2>&1"))

# 8. Call reload
print("=== Ejecutando recarga forzada... ===")
result = run(f"echo {pw} | sudo -S curl -s -X POST http://localhost:8080/api/admin/carga-simulacion?force=true 2>&1")
print(result)

client.close()
