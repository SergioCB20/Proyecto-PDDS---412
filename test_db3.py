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

# Simple queries
print("=== Vuelos total count ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b -c 'select count(*) from vuelos;' 2>&1", 10))

print("=== LA1111 anywhere ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b -c \"select id::text, codigo_vuelo, fecha_operacion, es_plantilla, estado from vuelos where codigo_vuelo = 'LA1111' order by fecha_operacion;\" 2>&1", 10))

print("=== Non-plantilla flight count by date ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b -c \"select fecha_operacion, count(*) from vuelos where not es_plantilla group by fecha_operacion order by fecha_operacion;\" 2>&1", 10))

print("=== Duplicates violating unique constraint ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b -c \"select fecha_operacion, codigo_vuelo, count(*) from vuelos where fecha_operacion = '2026-06-01' and not es_plantilla group by fecha_operacion, codigo_vuelo having count(*) > 1;\" 2>&1", 10))

print("=== Plantilla flights with fecha_operacion set ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b -c \"select codigo_vuelo, fecha_operacion, count(*) from vuelos where es_plantilla = true and fecha_operacion is not null group by codigo_vuelo, fecha_operacion limit 10;\" 2>&1", 10))

print("=== Es_plantilla null count ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b -c \"select count(*) from vuelos where es_plantilla is null;\" 2>&1", 10))

client.close()
