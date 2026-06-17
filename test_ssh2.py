import paramiko, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('1inf54-983-4d.inf.pucp.edu.pe', username='1inf54.983.4d', password='Bw39q25X', timeout=10)

def run(cmd, timeout=10):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    print(f'$ {cmd}')
    if out: print(out)
    if err: print(f'[ERR]: {err.strip() if err.strip() else "(empty)"}')
    print('---')

# First, try journalctl (user can see systemd user logs)
run('journalctl --user -n 20 --no-pager --no-hostname 2>&1', timeout=5)

# Check if Python is available for DB queries
run('which python3 python', timeout=5)

# Try direct psql as postgres via local socket (peer auth)
run('sudo -u postgres psql -d tasfb2b_db -c "SELECT 1 as test;" 2>&1', timeout=5)

client.close()
