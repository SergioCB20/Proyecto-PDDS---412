import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('1inf54-983-4d.inf.pucp.edu.pe', username='1inf54.983.4d', password='Bw39q25X', timeout=10)
PW = 'Bw39q25X'
DB = 'tasfb2b_db'

def run(cmd, timeout=15):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    return chan.makefile('r', -1).read()

# Grep ONLY recent - last 3000 lines from catalina.out
print("=== App startup logs (from last 3000 lines) ===")
print(run(f"echo {PW} | sudo -S tail -3000 /opt/tomcat11/logs/catalina.out | grep -E 'Started BackendApplication|Flyway|Migration|V36|V37|Error|Exception|Root WebApplicationContext' | tail -20", timeout=60))

print("\n=== Check if V37 exists ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '37');\" 2>&1", timeout=10))

print("\n=== All equipajes indexes ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'equipajes';\" 2>&1", timeout=10))

client.close()
