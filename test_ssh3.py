import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('1inf54-983-4d.inf.pucp.edu.pe', username='1inf54.983.4d', password='Bw39q25X', timeout=10)

def run(cmd, timeout=15):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    out = chan.makefile('r', -1).read()
    print(f'$ {cmd}')
    print(out)
    print('---')

# sudo -S with password piped works when PTY is allocated
PW = 'Bw39q25X'

# Kill stuck sessions
run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b_db -c \"UPDATE sesiones_ejecucion SET estado = 'FINALIZADA', fecha_fin_real = NOW() WHERE estado = 'EN_CURSO';\"")

# Session state
run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b_db -c \"SELECT id, estado, fecha_alineada_a, dia_hora_virtual, fecha_inicio_virtual FROM sesiones_ejecucion ORDER BY created_at DESC LIMIT 5;\"")

# Vuelos
run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b_db -c \"SELECT count(*), estado FROM vuelos WHERE es_plantilla = false GROUP BY estado ORDER BY estado;\"")

# Equipajes
run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b_db -c \"SELECT count(*), estado FROM equipajes GROUP BY estado;\"")

# PlanViaje
run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b_db -c \"SELECT count(*) FROM plan_viaje;\"")

# Tomcat logs - last 100 lines
run(f"echo {PW} | sudo -S journalctl -u tomcat11 --no-pager -n 100 --no-hostname | tail -80")

client.close()
