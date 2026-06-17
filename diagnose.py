import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('1inf54-983-4d.inf.pucp.edu.pe', username='1inf54.983.4d', password='Bw39q25X')

PW = 'Bw39q25X'

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    print(f'$ {cmd}')
    if out: print(out)
    if err: print(f'[STDERR]: {err.strip()}')
    print('---')

S = f"echo '{PW}' | sudo -S"

# Kill stuck sessions
run(f"{S} -u postgres psql -d tasfb2b_db -c \"UPDATE sesiones_ejecucion SET estado = 'FINALIZADA', fecha_fin_real = NOW() WHERE estado = 'EN_CURSO';\"")

# Session state
run(f"{S} -u postgres psql -d tasfb2b_db -c \"SELECT id, estado, fecha_alineada_a, dia_hora_virtual, fecha_inicio_virtual FROM sesiones_ejecucion ORDER BY created_at DESC LIMIT 5;\"")

# Vuelos instanciados
run(f"{S} -u postgres psql -d tasfb2b_db -c \"SELECT count(*), estado FROM vuelos WHERE es_plantilla = false GROUP BY estado ORDER BY estado;\"")

# Equipajes
run(f"{S} -u postgres psql -d tasfb2b_db -c \"SELECT count(*), estado FROM equipajes GROUP BY estado;\"")

# PlanViaje
run(f"{S} -u postgres psql -d tasfb2b_db -c \"SELECT count(*) FROM plan_viaje;\"")

# Tomcat logs (today)
run(f"{S} journalctl -u tomcat11 --no-pager -n 500 --no-hostname | grep -iE 'Preparacion|clonando|marcarLista|readiness|error|Exception|Async|TaskExecutor' | tail -30")

# Tomcat started at?
run(f"{S} journalctl -u tomcat11 --no-pager --no-hostname | grep -i 'Started\|Stopped\|Starting\|Tomcat' | tail -10")

# App logs
run(f"{S} journalctl -u tomcat11 --no-pager -n 300 --no-hostname | tail -80")

client.close()
