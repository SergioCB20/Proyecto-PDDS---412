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

# Check if equipajes has plan_viaje_id
print("=== Columnas de equipajes ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b_db -c \"\\d equipajes\" 2>&1", timeout=10))

# Check flyway_schema_history to see what's applied
print("\n=== Flyway applied migrations ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b_db -c \"SELECT version, description, installed_on FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 20\" 2>&1", timeout=10))

client.close()
