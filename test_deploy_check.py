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

# Check if ROOT.war was redeployed (timestamp)
print("=== ROOT.war timestamp ===")
print(run(f"echo {PW} | sudo -S ls -la /opt/tomcat11/webapps/ROOT.war 2>/dev/null", timeout=5))

# Check app process uptime
print("=== Java process start time ===")
print(run(f"echo {PW} | sudo -S ps -p 269665 -o lstart= 2>/dev/null || echo 'PID not found'", timeout=5))

# Check for any new PID (maybe redeployed)
print("=== Tomcat process ===")
print(run(f"echo {PW} | sudo -S ps aux | grep '[t]omcat' | head -5", timeout=5))

# Check new war uploads
print("=== ROOT.war in temp uploads ===")
print(run(f"echo {PW} | sudo -S ls -la /opt/tomcat11/webapps/ROOT.war 2>/dev/null; echo {PW} | sudo -S ls -la /opt/tomcat11/webapps/ROOT/ 2>/dev/null | head -5", timeout=5))

# Check if the new code has the TransactionSynchronizationManager fix
print("=== New code deployed? (check SesionService class) ===")
print(run(f"echo {PW} | sudo -S grep -c 'TransactionSynchronizationManager' /opt/tomcat11/webapps/ROOT/WEB-INF/classes/com/tasfb2b/backend/bc2/application/SesionService.class 2>/dev/null || echo 'Class not found'", timeout=10))

# Also check actual running WAR
print("=== Unpacked WAR ===")
print(run(f"echo {PW} | sudo -S ls -la /opt/tomcat11/webapps/ROOT/WEB-INF/classes/com/tasfb2b/backend/bc2/application/SesionService.class 2>/dev/null", timeout=5))

client.close()
