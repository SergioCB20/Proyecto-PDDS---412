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

# 1. Truncate catalina.out (3.7GB!)
print("=== Truncating catalina.out ===")
print(run(f"echo {PW} | sudo -S sh -c '> /opt/tomcat11/logs/catalina.out' 2>&1", timeout=10))

# 2. Clean npm cache
print("\n=== Cleaning npm cache ===")
print(run(f"echo {PW} | sudo -S -u 1inf54.983.4d sh -c 'npm cache clean --force 2>/dev/null' 2>&1", timeout=10))

# 3. Remove old rotated logs (keep last 7 days)
print("\n=== Removing old rotated logs (before June 10) ===")
print(run(f"echo {PW} | sudo -S find /opt/tomcat11/logs -name 'catalina.*.log' -mtime +7 -delete 2>&1", timeout=10))

# 4. Verify freed space
print("\n=== Disk after cleanup ===")
print(run(f"echo {PW} | sudo -S df -h /", timeout=10))

client.close()
