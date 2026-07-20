#!/usr/bin/env python3
import paramiko, sys

HOST = '1inf54-983-4d.inf.pucp.edu.pe'
USER = '1inf54.983.4d'
PW = 'Bw39q25X'
DB = 'tasfb2b_db'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PW, timeout=10)

def run(cmd, timeout=30):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    return chan.makefile('r', -1).read()

pw = PW
db = DB

print("=== 1. Equipajes SABE->VIDP por estado ===")
q = "SELECT estado, count(*) FROM equipajes WHERE origen_iata = 'SABE' AND destino_iata = 'VIDP' GROUP BY estado ORDER BY estado;"
print(run(f"echo {pw} | sudo -S -u postgres psql -d {db} -c \"{q}\" 2>&1", timeout=60))

print("=== 2. Muestra 5 registros ===")
q2 = "SELECT id_externo, origen_iata, destino_iata, estado, cantidad, fecha_operacion FROM equipajes WHERE origen_iata = 'SABE' AND destino_iata = 'VIDP' LIMIT 5;"
print(run(f"echo {pw} | sudo -S -u postgres psql -d {db} -c \"{q2}\" 2>&1", timeout=30))

print("=== 3. Min/Max fecha_operacion + total ===")
q3 = "SELECT min(fecha_operacion), max(fecha_operacion), count(*) FROM equipajes WHERE origen_iata = 'SABE' AND destino_iata = 'VIDP';"
print(run(f"echo {pw} | sudo -S -u postgres psql -d {db} -c \"{q3}\" 2>&1", timeout=30))

print("=== 4. Total equipajes en BD ===")
q4 = "SELECT count(*) FROM equipajes;"
print(run(f"echo {pw} | sudo -S -u postgres psql -d {db} -c \"{q4}\" 2>&1", timeout=60))

print("=== 5. Nodos SABE y VIDP ===")
q5 = "SELECT codigo_iata, nombre, continente, capacidad_almacen FROM nodos_logisticos WHERE codigo_iata IN ('SABE','VIDP');"
print(run(f"echo {pw} | sudo -S -u postgres psql -d {db} -c \"{q5}\" 2>&1", timeout=10))

print("=== 6. Vuelos SABE->VIDP PROGRAMADO (no plantilla) ===")
q6 = "SELECT origen_iata, destino_iata, estado, count(*) FROM vuelos WHERE (origen_iata = 'SABE' OR destino_iata = 'VIDP') AND estado = 'PROGRAMADO' AND es_plantilla = false GROUP BY origen_iata, destino_iata, estado;"
print(run(f"echo {pw} | sudo -S -u postgres psql -d {db} -c \"{q6}\" 2>&1", timeout=30))

print("=== 7. Vuelos SABE->VIDP (cualquier estado) ===")
q7 = "SELECT codigo_vuelo, origen_iata, destino_iata, estado, es_plantilla FROM vuelos WHERE origen_iata = 'SABE' AND destino_iata = 'VIDP' LIMIT 10;"
print(run(f"echo {pw} | sudo -S -u postgres psql -d {db} -c \"{q7}\" 2>&1", timeout=30))

print("=== 8. Vuelos SABE->* (cualquier destino) PROGRAMADO no plantilla ===")
q8 = "SELECT codigo_vuelo, origen_iata, destino_iata, hora_salida, hora_llegada FROM vuelos WHERE origen_iata = 'SABE' AND estado = 'PROGRAMADO' AND es_plantilla = false LIMIT 10;"
print(run(f"echo {pw} | sudo -S -u postgres psql -d {db} -c \"{q8}\" 2>&1", timeout=30))

print("=== 9. Vuelos *->VIDP PROGRAMADO no plantilla ===")
q9 = "SELECT codigo_vuelo, origen_iata, destino_iata, hora_salida, hora_llegada FROM vuelos WHERE destino_iata = 'VIDP' AND estado = 'PROGRAMADO' AND es_plantilla = false LIMIT 10;"
print(run(f"echo {pw} | sudo -S -u postgres psql -d {db} -c \"{q9}\" 2>&1", timeout=30))

client.close()
