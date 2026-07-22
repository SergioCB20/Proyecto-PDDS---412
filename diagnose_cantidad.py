#!/usr/bin/env python3
"""Verify cantidad actual in DB for session 5529f055 equipajes."""
import paramiko

HOST = '1inf54-983-4d.inf.pucp.edu.pe'
USER = '1inf54.983.4d'
PW = 'Bw39q25X'
DB = 'tasfb2b_db'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PW, timeout=10)

def run(cmd, timeout=20):
    try:
        chan = client.get_transport().open_session()
        chan.settimeout(timeout)
        chan.get_pty()
        chan.exec_command(cmd)
        return chan.makefile('r', -1).read()
    except Exception as e:
        return f"[ERR: {e}]"

def section(t):
    print(f"\n=== {t} ===")

section("Distribución de cantidad (todos equipajes)")
print(run(f"""echo {PW} | sudo -S -u postgres psql -d {DB} -c "
SELECT cantidad, COUNT(*) AS n
FROM equipajes
GROUP BY cantidad ORDER BY cantidad;" 2>&1""", timeout=15))

section("Equipajes de la sesion 5529f055 con cantidad>1")
print(run(f"""echo {PW} | sudo -S -u postgres psql -d {DB} -c "
SELECT e.estado, e.cantidad, COUNT(*) AS n,
       SUM(e.cantidad) AS total_bags
FROM equipajes e
JOIN planes_viaje p ON p.equipaje_id = e.id
WHERE p.sesion_id::text LIKE '5529f055%'
GROUP BY e.estado, e.cantidad
ORDER BY e.estado, e.cantidad;" 2>&1""", timeout=15))

section("Conteo físico de maletas (rows en tabla maletas) vs suma de `cantidad` de equipaje")
print(run(f"""echo {PW} | sudo -S -u postgres psql -d {DB} -c "
SELECT
  (SELECT COUNT(*) FROM maletas) AS total_maletas_rows,
  (SELECT SUM(cantidad) FROM equipajes) AS total_bags_esperados;" 2>&1""", timeout=15))

section("Verifica cargarDisponible vs reservas reales")
print(run(f"""echo {PW} | sudo -S -u postgres psql -d {DB} -c "
SELECT v.codigo_vuelo, v.capacidad_carga, v.carga_disponible,
       (v.capacidad_carga - v.carga_disponible) AS reservado,
       COALESCE((
         SELECT SUM(eq.cantidad)
         FROM segmentos_plan sp
         JOIN planes_viaje pv ON pv.id = sp.plan_viaje_id
         JOIN equipajes eq ON eq.id = pv.equipaje_id
         WHERE sp.vuelo_id = v.id
           AND sp.estado IN ('PENDIENTE','EN_CURSO')
       ), 0) AS reservado_real
FROM vuelos v
WHERE v.es_plantilla = false
  AND v.fecha_operacion = '2027-08-08'
  AND v.carga_disponible < v.capacidad_carga
ORDER BY reservado DESC
LIMIT 10;" 2>&1""", timeout=15))

section("Top 10 ocupaciones con disbalance")
print(run(f"""echo {PW} | sudo -S -u postgres psql -d {DB} -c "
SELECT n.codigo_iata, o.ocupacion AS ocupacion_sim,
       COALESCE((
         SELECT SUM(eq.cantidad)
         FROM planes_viaje pv
         JOIN equipajes eq ON eq.id = pv.equipaje_id
         JOIN segmentos_plan sp ON sp.plan_viaje_id = pv.id
         WHERE pv.sesion_id::text LIKE '5529f055%'
           AND sp.estado IN ('PENDIENTE','EN_CURSO')
           AND (sp.nodo_destino_id = n.id OR sp.nodo_origen_id = n.id)
       ), 0) AS reserva_vuelos
FROM nodos_logisticos n
LEFT JOIN ocupacion_nodo o ON o.nodo_id = n.id AND o.sesion_id::text LIKE '5529f055%'
WHERE o.ocupacion > 0
ORDER BY o.ocupacion DESC LIMIT 10;" 2>&1""", timeout=15))

client.close()
print("\nfin.")
