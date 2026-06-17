import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('1inf54-983-4d.inf.pucp.edu.pe', username='1inf54.983.4d', password='Bw39q25X', timeout=10)
PW = 'Bw39q25X'

def run(cmd, timeout=10):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    return chan.makefile('r', -1).read()

# List databases
print("=== List databases ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -l 2>&1", timeout=10))

# Check env config for DB connection
print("\n=== Tomcat env ===")
print(run(f"echo {PW} | sudo -S cat /opt/tomcat11/conf/Catalina/localhost/ROOT.xml 2>/dev/null || echo 'No ROOT.xml'", timeout=10))

print("\n=== Env file or systemd ===")
print(run(f"echo {PW} | sudo -S cat /etc/systemd/system/tomcat.service 2>/dev/null | head -40 || echo 'No tomcat.service'", timeout=10))

client.close()
