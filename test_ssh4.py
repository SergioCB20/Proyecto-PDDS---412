import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('1inf54-983-4d.inf.pucp.edu.pe', username='1inf54.983.4d', password='Bw39q25X', timeout=10)

PW = 'Bw39q25X'

def run(cmd, timeout=30):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    out = chan.makefile('r', -1).read()
    print(f'$ {cmd}')
    print(out)
    print('---')

# Check for the key log lines in ALL tomcat logs
run(f"echo {PW} | sudo -S journalctl -u tomcat11 --no-pager -n 1000 --no-hostname | grep -iE 'Preparacion|clonando|marcarLista|readiness|error|Exception|sesion|simulacion' | tail -40", timeout=10)

# Check the app startup log
run(f"echo {PW} | sudo -S journalctl -u tomcat11 --no-pager -n 500 --no-hostname | grep -iE 'Started Backend|CargaSimulacion|cargarTodos|equipaje insertado|EntityManager|JPA|Hibernate|Flyway' | tail -20", timeout=10)

# Last 50 lines regardless
run(f"echo {PW} | sudo -S journalctl -u tomcat11 --no-pager -n 200 --no-hostname | tail -50", timeout=10)

# Count equipajes fast (just estado REGISTRADO count)
run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b_db -c \"SELECT count(*) FROM equipajes WHERE estado = 'REGISTRADO';\"", timeout=30)

# Check if there's any PlanViaje for the latest session 
run(f"echo {PW} | sudo -S -u postgres psql -d tasfb2b_db -c \"SELECT id, fecha_alineada_a, dia_hora_virtual FROM sesiones_ejecucion ORDER BY created_at DESC LIMIT 1;\"", timeout=10)

client.close()
