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

# Find ALL duplicate plantillas
print("=== Duplicate plantilla codigo_vuelo ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"select codigo_vuelo, count(*) from vuelos where es_plantilla = true group by codigo_vuelo having count(*) > 1 order by codigo_vuelo;\" 2>&1", 10))

# Count total plantillas
print("\n=== Total plantillas ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"select count(*) from vuelos where es_plantilla = true;\" 2>&1", 10))

# Count distinct codigo_vuelo among plantillas
print("\n=== Distinct codigo_vuelo among plantillas ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"select count(distinct codigo_vuelo) from vuelos where es_plantilla = true;\" 2>&1", 10))

# Check if there are duplicate codigo_vuelo across plantillas with same route
print("\n=== Duplicate plantilla details (show first 20) ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"select v1.id::text, v1.codigo_vuelo, v1.origen_id::text, v1.destino_id::text, v1.hora_salida, v1.hora_llegada from vuelos v1 where v1.es_plantilla = true and v1.codigo_vuelo in (select codigo_vuelo from vuelos where es_plantilla = true group by codigo_vuelo having count(*) > 1) order by v1.codigo_vuelo limit 20;\" 2>&1", 10))

# Check if duplicate plantillas have different routes or times
print("\n=== LA1111 plantillas details ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"select id::text, codigo_vuelo, origen_id::text, destino_id::text, hora_salida, hora_llegada, capacidad_carga from vuelos where codigo_vuelo = 'LA1111' and es_plantilla = true;\" 2>&1", 10))

client.close()
