import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('1inf54-983-4d.inf.pucp.edu.pe', username='1inf54.983.4d', password='Bw39q25X', timeout=10)
PW = 'Bw39q25X'
DB = 'tasfb2b_db'

def run(cmd, timeout=10):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    return chan.makefile('r', -1).read()

# Remove the failed V37 entry from flyway_schema_history
print("=== Removing failed V37 from flyway_schema_history ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"DELETE FROM flyway_schema_history WHERE version = '37';\" 2>&1", timeout=10))

# Verify
print("=== Verify V37 removed ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT version, description, success FROM flyway_schema_history WHERE version = '37';\" 2>&1", timeout=10))

# Show latest migrations
print("=== Latest migrations ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT version, description, success FROM flyway_schema_history ORDER BY version DESC LIMIT 5;\" 2>&1", timeout=10))

client.close()
