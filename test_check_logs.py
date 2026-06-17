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

# Since app restarted at 22:15, get ALL logs from 22:15 onward
print("=== All logs since 22:15 ===")
print(run(f"echo {PW} | sudo -S grep '22:1[5-9]|22:2[0-9]|22:3[0-9]|22:4[0-9]|22:5[0-9]' /opt/tomcat11/logs/catalina.2026-06-16.log 2>/dev/null | tail -80", timeout=10))

# Just get the last 40 lines
print("\n=== Last 40 lines of today log ===")
print(run(f"echo {PW} | sudo -S tail -40 /opt/tomcat11/logs/catalina.2026-06-16.log", timeout=10))

# Check catalina.out for recent app logs (tail -50)
print("\n=== Last 50 lines of catalina.out ===")
print(run(f"echo {PW} | sudo -S tail -50 /opt/tomcat11/logs/catalina.out", timeout=10))

client.close()
