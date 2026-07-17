#!/usr/bin/env python3
import paramiko

HOST = '1inf54-983-4d.inf.pucp.edu.pe'
USER = '1inf54.983.4d'
PW = 'Bw39q25X'
DB = 'tasfb2b_db'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PW, timeout=15)

def run(cmd, timeout=15):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.exec_command(cmd)
    out = chan.makefile('rb', -1).read()
    return out.decode('utf-8', errors='replace')

# Test 1: basic
print("=== Test 1: whoami ===")
print(run("whoami"))

# Test 2: sudo echo
print("=== Test 2: sudo echo ===")
print(run(f"echo '{PW}' | sudo -S echo ok 2>&1"))

# Test 3: pg_isready
print("=== Test 3: pg_isready ===")
print(run(f"echo '{PW}' | sudo -S -u postgres pg_isready 2>&1"))

# Test 4: psql simple query
print("=== Test 4: psql SELECT 1 ===")
print(run(f"echo '{PW}' | sudo -S -u postgres psql -d {DB} -c 'SELECT 1;' 2>&1"))

# Test 5: psql list tables
print("=== Test 5: psql equipajes count ===")
print(run(f"echo '{PW}' | sudo -S -u postgres psql -d {DB} -c 'SELECT count(*) FROM equipajes;' 2>&1"))

client.close()
