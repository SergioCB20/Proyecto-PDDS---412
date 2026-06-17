import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('1inf54-983-4d.inf.pucp.edu.pe', username='1inf54.983.4d', password='Bw39q25X', timeout=10)
PW = 'Bw39q25X'
DB = 'tasfb2b_db'

def run(cmd, timeout=30):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    return chan.makefile('r', -1).read()

# Check if Tomcat is still alive
print("=== Tomcat status ===")
print(run(f"echo {PW} | sudo -S systemctl status tomcat11 2>&1 | head -20", timeout=10))

# Check if 8080 is open
print("\n=== Port 8080 ===")
print(run(f"echo {PW} | sudo -S ss -tlnp | grep 8080", timeout=5))

# Check for long-running PostgreSQL queries (active queries)
print("\n=== Active Postgres queries ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state FROM pg_stat_activity WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%' ORDER BY duration DESC LIMIT 10;\" 2>&1", timeout=10))

# Check Java process CPU
print("\n=== Java CPU usage ===")
print(run(f"echo {PW} | sudo -S top -bn1 -p $(pgrep -f 'tomcat') 2>&1 | tail -3", timeout=10))

# Check catalina out for recent activity
print("\n=== Recent catalina.out (last 5 lines) ===")
print(run(f"echo {PW} | sudo -S tail -5 /opt/tomcat11/logs/catalina.out", timeout=10))

client.close()
