#!/usr/bin/env python3
"""
Diagnóstico remoto ampliado - TAS FB2B Operación.
Uso: python3 diagnose_full.py
"""
import paramiko, sys, json

HOST = '1inf54-983-4d.inf.pucp.edu.pe'
USER = '1inf54.983.4d'
PW = 'Bw39q25X'
DB = 'tasfb2b_db'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PW, timeout=30)

def run(cmd, timeout=30):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    return chan.makefile('r', -1).read()

def section(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")

sudo = f"echo {PW} | sudo -S"

section("1. Nginx config")
print(run(f"{sudo} cat /etc/nginx/sites-enabled/tasfb2b 2>&1 | head -60", timeout=5))

section("2. Equipajes distribution")
print(run(f"{sudo} -u postgres psql -d {DB} -c \"SELECT estado::text, COUNT(*)::bigint FROM equipajes GROUP BY estado ORDER BY estado;\" 2>&1", timeout=60))

section("3. Vuelos plantilla vs instancias")
print(run(f"{sudo} -u postgres psql -d {DB} -c \"SELECT es_plantilla, COUNT(*), COUNT(DISTINCT codigo_vuelo) FROM vuelos GROUP BY es_plantilla;\" 2>&1", timeout=10))

section("4. Vuelos instanciados por estado")
print(run(f"{sudo} -u postgres psql -d {DB} -c \"SELECT estado, COUNT(*) FROM vuelos WHERE es_plantilla = false GROUP BY estado ORDER BY estado;\" 2>&1", timeout=10))

section("5. Vuelos plantilla - sample 5")
print(run(f"{sudo} -u postgres psql -d {DB} -c \"SELECT codigo_vuelo, estado, fecha_operacion FROM vuelos WHERE es_plantilla = true LIMIT 5;\" 2>&1", timeout=10))

section("6. Sesiones activas")
print(run(f"{sudo} -u postgres psql -d {DB} -c \"SELECT id::text, estado, dia_hora_virtual, fecha_alineada_a, tipo FROM sesiones_ejecucion ORDER BY fecha_creacion DESC LIMIT 10;\" 2>&1", timeout=10))

section("7. EXPLAIN ANALYZE - equipajes GROUP BY")
print(run(f"{sudo} -u postgres psql -d {DB} -c \"EXPLAIN ANALYZE SELECT estado::text, COUNT(*)::bigint FROM equipajes GROUP BY estado;\" 2>&1", timeout=60))

section("8. SSE direct test (backend 8080)")
token = run(
    f"curl -s -X POST http://localhost:8080/api/auth/login "
    f"-H 'Content-Type: application/json' "
    f"-d '{{\"correo\":\"operador@tasfb2b.com\",\"password\":\"operador123\"}}' "
    f"| python3 -c \"import sys,json; print(json.load(sys.stdin)['token'])\"",
    timeout=10
).strip()
if token and 'Error' not in token and len(token) > 20:
    print("Token OK, probando SSE...")
    print(run(
        f"timeout 5 curl -s -N -H 'Authorization: Bearer {token}' "
        f"http://localhost:8080/api/eventos/planificacion 2>&1; echo 'EXIT: '$?",
        timeout=10
    )[:1000])
else:
    print(f"Token FAIL: {token[:100]}")

section("9. tomcat logs (tail 20)")
print(run(f"{sudo} tail -20 /opt/tomcat11/logs/catalina.out 2>&1", timeout=10))

section("10. PG index size / dead tuples")
print(run(f"{sudo} -u postgres psql -d {DB} -c \"SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch FROM pg_stat_user_indexes WHERE tablename IN ('equipajes','vuelos') ORDER BY tablename, idx_scan DESC;\" 2>&1", timeout=10))

client.close()
print("\n✅ Done.")
