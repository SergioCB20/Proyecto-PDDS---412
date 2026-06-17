import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('1inf54-983-4d.inf.pucp.edu.pe', username='1inf54.983.4d', password='Bw39q25X')

def run(cmd, timeout=15):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    print(f'$ {cmd}')
    if out: print(out)
    if err: print(f'[ERR]: {err.strip() if err.strip() else "(empty)"}')

# Simple test - no sudo
run('echo "hello from server" && hostname && whoami')

# Check Tomcat process
run('ps aux | grep tomcat | grep -v grep | head -5')

# Check if postgres is accessible without sudo (should fail)
run('psql -d tasfb2b_db -c "SELECT 1;" 2>&1 | head -5')

# Try psql as postgres user with sudo
run('echo Bw39q25X | sudo -S -u postgres psql -d tasfb2b_db -c "SELECT count(*) FROM equipajes LIMIT 1;" 2>&1', timeout=30)

# Check journalctl non-sudo
run('journalctl -u tomcat11 --no-pager -n 30 --no-hostname 2>&1 | head -20', timeout=10)

client.close()
