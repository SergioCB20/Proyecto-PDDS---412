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
    return chan.makefile('r', -1).read()

print("=== Disk usage ===")
print(run(f"echo {PW} | sudo -S df -h /", timeout=10))

print("\n=== Largest directories ===")
print(run(f"echo {PW} | sudo -S du -sh /opt/tomcat11/logs/catalina.out /home/*/.npm /opt/tomcat11/webapps /opt/tomcat11/work /tmp/* 2>/dev/null | sort -rh | head -10", timeout=10))

print("\n=== Disk usage by directory ===")
print(run(f"echo {PW} | sudo -S du -sh /opt/tomcat11/logs/ 2>/dev/null", timeout=10))
print(run(f"echo {PW} | sudo -S du -sh /home/1inf54.983.4d/.npm/ 2>/dev/null", timeout=10))
print(run(f"echo {PW} | sudo -S du -sh /tmp/ 2>/dev/null", timeout=10))

client.close()
