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

# Now query the correct DB
print("=== Vuelos total ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c 'select count(*) from vuelos;' 2>&1", 10))

print("=== LA1111 anywhere ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"select id, codigo_vuelo, fecha_operacion, es_plantilla, estado from vuelos where codigo_vuelo = 'LA1111' order by fecha_operacion;\" 2>&1", 10))

print("=== Non-plantilla by date ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"select fecha_operacion, count(*) from vuelos where not es_plantilla group by fecha_operacion order by fecha_operacion;\" 2>&1", 10))

print("=== Duplicates on 2026-06-01 ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"select fecha_operacion, codigo_vuelo, count(*) from vuelos where fecha_operacion = '2026-06-01' and not es_plantilla group by fecha_operacion, codigo_vuelo having count(*) > 1;\" 2>&1", 10))

print("=== Indexes on vuelos ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"select indexname, indexdef from pg_indexes where tablename = 'vuelos';\" 2>&1", 10))

print("=== Constraint details ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"\\d vuelos\" 2>&1 | head -50", 10))

client.close()
