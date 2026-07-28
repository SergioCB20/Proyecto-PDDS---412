#!/usr/bin/env python3
"""Sube y ejecuta insert_vuelos_hoy.sql en el servidor de BD.

Uso:
    python insert_vuelos_hoy.py

Requisitos: pip install paramiko
"""
import paramiko, sys, time, os

HOST = '1inf54-983-4d.inf.pucp.edu.pe'
USER = '1inf54.983.4d'
PW = 'Bw39q25X'
DB = 'tasfb2b_db'
REMOTE_SQL = '/tmp/insert_vuelos_hoy.sql'
LOCAL_SQL = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'insert_vuelos_hoy.sql')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

def run(cmd, timeout=60):
    for attempt in range(2):
        try:
            chan = client.get_transport().open_session()
            chan.settimeout(timeout)
            chan.get_pty()
            chan.exec_command(cmd)
            out = chan.makefile('r', -1).read()
            return out
        except Exception as e:
            if attempt == 0:
                time.sleep(2)
                continue
            return f"TIMEOUT/ERROR: {e}\n"
    return ""

def pq(query, timeout=60):
    return run(f"echo {PW} | sudo -S -u postgres psql -t -A -d {DB} -c \"{query}\" 2>&1", timeout)

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

try:
    print("Conectando al servidor...")
    client.connect(HOST, username=USER, password=PW, timeout=15)
    print("OK")

    # 1. Subir el SQL via SFTP
    section("1. Subiendo insert_vuelos_hoy.sql al servidor")
    sftp = client.open_sftp()
    sftp.put(LOCAL_SQL, REMOTE_SQL)
    sftp.close()
    print(f"  Subido a {REMOTE_SQL}")

    # 2. Contar plantillas antes
    section("2. Plantillas disponibles en BD")
    print(pq("SELECT COUNT(*) FROM vuelos WHERE es_plantilla = true"))

    # 3. Contar vuelos existentes para hoy
    section("3. Vuelos existentes para 2026-07-27 antes de insertar")
    print(pq("SELECT COUNT(*) FROM vuelos WHERE fecha_operacion = '2026-07-27'"))

    # 4. Ejecutar el script SQL
    section("4. Ejecutando insert_vuelos_hoy.sql")
    out = run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -f {REMOTE_SQL} 2>&1", timeout=120)
    print(out if out else "  (sin salida, probablemente OK)")

    # 5. Verificar insercion
    section("5. Vuelos historicos insertados para 2026-07-27")
    total = pq("SELECT COUNT(*) FROM vuelos WHERE fecha_operacion = '2026-07-27' AND tag = 'tag_historico'")
    print(f"  Total historicos: {total.strip()}")

    programados = pq("SELECT COUNT(*) FROM vuelos WHERE fecha_operacion = '2026-07-27' AND tag = 'tag_historico' AND estado = 'EN_RUTA'")
    print(f"  EN_RUTA historicos: {programados.strip()}")

    # 6. Limpiar
    section("6. Limpiando archivo temporal")
    run(f"rm -f {REMOTE_SQL}")
    print("  OK")

    section("RESUMEN FINAL")
    print(f"  Vuelos historicos EN_RUTA insertados para 2026-07-27: {total.strip()}")

except Exception as e:
    print(f"\nERROR: {e}")
    sys.exit(1)
finally:
    client.close()
    print("\nDone")
