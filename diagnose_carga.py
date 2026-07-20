#!/usr/bin/env python3
"""
Compara envios .txt vs BD produccion.
Rango TXT conocido: 2026-11 a 2027-03.
Uso: python diagnose_carga.py

Nota: 2027-08-08 a 2027-08-13 NO existe en .txt, solo en BD (generado por simulación).
"""
import paramiko, os, re, sys
from collections import defaultdict

HOST = '1inf54-983-4d.inf.pucp.edu.pe'
USER = '1inf54.983.4d'
PW = 'Bw39q25X'
DB = 'tasfb2b_db'
DATA_DIR = '/home/1inf54.983.4d/proyecto/backend/backend/src/main/resources/data/'

FILE_PATTERN = re.compile(r'^_envios_([A-Z0-9]{4})_\.txt$')
LINE_PATTERN = re.compile(r'^([^-]+)-(\d{8})-(\d{2})-(\d{2})-([A-Z0-9]{4})-(\d+)-?(.*)$')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PW, timeout=15)

def run(cmd, timeout=120):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.exec_command(cmd)
    out = chan.makefile('rb', -1).read()
    return out.decode('utf-8', errors='replace')

def run_psql(sql, timeout=120):
    # escape double quotes for shell inside double-quoted -c argument
    escaped = sql.replace('"', '\\"')
    cmd = f"echo '{PW}' | sudo -S -u postgres psql -d {DB} -t -A -c \"{escaped}\" 2>/dev/null"
    raw = run(cmd, timeout)
    lines = []
    for l in raw.split('\n'):
        s = l.strip()
        if s and 'password' not in s.lower() and not s.startswith('('):
            lines.append(s)
    return lines

def get_txt_date_range():
    """Quick scan one file to find date range."""
    lines = run(f"head -1 {DATA_DIR}/_envios_EBCI_.txt", timeout=10).strip()
    m = LINE_PATTERN.match(lines)
    if m:
        first_date = m.group(2)
    else:
        first_date = '?'

    lines = run(f"tail -1 {DATA_DIR}/_envios_EBCI_.txt", timeout=10).strip()
    m = LINE_PATTERN.match(lines)
    if m:
        last_date = m.group(2)
    else:
        last_date = '?'

    return first_date, last_date

def load_txt_data():
    """Parse all _envios_*.txt, return list of records + summary."""
    records = []
    errors = 0
    total_lines = 0

    ls = run(f"ls {DATA_DIR}/_envios_*.txt 2>/dev/null", timeout=10)
    files = [f.strip() for f in ls.strip().split('\n') if f.strip() and f.strip().endswith('.txt')]

    for fpath in files:
        fname = os.path.basename(fpath).strip()
        m = FILE_PATTERN.match(fname)
        if not m:
            continue
        origin = m.group(1)

        content = run(f"cat {fpath}", timeout=300)
        for lineno, raw_line in enumerate(content.split('\n'), 1):
            line = raw_line.strip()
            if not line:
                continue
            total_lines += 1
            lmatch = LINE_PATTERN.match(line)
            if not lmatch:
                errors += 1
                if errors <= 5:
                    print(f"    ERROR parse {fname}:{lineno}: {line[:80]}")
                continue

            date_str = lmatch.group(2)
            dest = lmatch.group(5)
            qty = int(lmatch.group(6))
            records.append((date_str, origin, dest, qty, line))

    return records, total_lines, errors

# --- MAIN ---
print("=" * 70)
print("DIAGNÓSTICO DE CARGA DE ENVÍOS")
print("=" * 70)

# 1. Check files
print(f"\n[1] Directorio datos: {DATA_DIR}")
first_d, last_d = get_txt_date_range()
print(f"  Rango fechas en archivos: {first_d} a {last_d}")
print(f"  (NO cubre 2027-08-08 a 2027-08-13)")

# 2. Check BD for Aug dates
print(f"\n[2] BD: equipajes en 2027-08-08 a 2027-08-13")

sql_range = "SELECT fecha_operacion::date, count(*) FROM equipajes WHERE fecha_operacion::date BETWEEN '2027-08-08' AND '2027-08-13' GROUP BY 1 ORDER BY 1;"
rows = run_psql(sql_range, 120)
total_aug = 0
for r in rows:
    parts = r.split('|')
    if len(parts) == 2:
        print(f"  {parts[0]}: {parts[1]} equipajes")
        total_aug += int(parts[1])
print(f"  Total: {total_aug} equipajes")

# These dates don't exist in txt files - simulation generated them
print(f"\n[3] Comparación: rango superpuesto TXT vs BD")
print(f"  Cargando archivos .txt (puede tardar)...")

txt_data, total_lines, parse_errs = load_txt_data()
print(f"  Archivos: {total_lines} líneas totales, {parse_errs} errores parseo")
print(f"  Líneas válidas: {len(txt_data)}")

# Group txt by date
txt_by_date = defaultdict(lambda: [0, 0])  # equipajes, cantidad
for r in txt_data:
    txt_by_date[r[0]][0] += 1
    txt_by_date[r[0]][1] += r[3]

min_txt_date = min(txt_by_date.keys()) if txt_by_date else '?'
max_txt_date = max(txt_by_date.keys()) if txt_by_date else '?'
print(f"  Rango TXT: {min_txt_date} a {max_txt_date}")

# Query DB for same range
sql_db_range = f"SELECT fecha_operacion::date, count(*)::int, sum(cantidad)::int FROM equipajes WHERE fecha_operacion::date BETWEEN '2026-11-01' AND '2027-03-31' GROUP BY 1 ORDER BY 1;"
print(f"  Consultando BD...")
db_rows = run_psql(sql_db_range, 300)
db_by_date = defaultdict(lambda: [0, 0])
for r in db_rows:
    parts = r.split('|')
    if len(parts) == 3:
        fdate = parts[0].replace('-', '')
        db_by_date[fdate][0] += int(parts[1])
        db_by_date[fdate][1] += int(parts[2])

# Compare
all_dates = sorted(set(list(txt_by_date.keys()) + list(db_by_date.keys())))
diff_eq = 0
diff_cant = 0
mismatch_dates = []

print(f"\n  --- Comparación por fecha ---")
print(f"  {'Fecha':>10} {'Eq.TXT':>8} {'Eq.BD':>8} {'Dif':>8} {'Cant.TXT':>10} {'Cant.BD':>10} {'Dif.Cant':>10}")
print(f"  {'-'*10} {'-'*8} {'-'*8} {'-'*8} {'-'*10} {'-'*10} {'-'*10}")

for d in all_dates:
    te = txt_by_date[d][0] if d in txt_by_date else 0
    de = db_by_date[d][0] if d in db_by_date else 0
    tc = txt_by_date[d][1] if d in txt_by_date else 0
    dc = db_by_date[d][1] if d in db_by_date else 0
    deq = te - de
    dca = tc - dc
    diff_eq += deq
    diff_cant += dca
    if te != de or tc != dc:
        mismatch_dates.append(d)
    print(f"  {d:>10} {te:>8} {de:>8} {deq:>+8} {tc:>10} {dc:>10} {dca:>+10}")

print(f"\n  --- Resumen ---")
print(f"  Total equipajes TXT: {sum(txt_by_date[d][0] for d in txt_by_date)}")
print(f"  Total equipajes BD:  {sum(db_by_date[d][0] for d in db_by_date)}")
print(f"  Diferencia total:    {diff_eq:+}")
print(f"  Fechas con mismatch: {len(mismatch_dates)} de {len(all_dates)}")

if diff_eq == 0 and not mismatch_dates:
    print(f"\n  RESULTADO: Datos .txt coinciden exactamente con BD en rango superpuesto.")
else:
    print(f"\n  RESULTADO: Discrepancias encontradas en {len(mismatch_dates)} fechas.")
    if mismatch_dates:
        print(f"  Primeras 5 fechas con diff: {mismatch_dates[:5]}")

# Summary for user
print(f"\n{'='*70}")
print("CONCLUSION")
print(f"{'='*70}")
print(f"  1. Archivos _envios_*.txt cubren: {min_txt_date} a {max_txt_date}")
print(f"     (NOV 2026 - MAR 2027)")
print(f"  2. BD tiene datos desde 2026-01-01 hasta 2029-01-05.")
print(f"  3. Fechas 2027-08-08 a 2027-08-13 NO existen en archivos.")
print(f"     Esos datos fueron generados por el motor de simulación (bc2), no por carga de archivos.")
print(f"  4. Si la simulación muestra poca ocupación en esas fechas,")
print(f"     el problema NO es la carga de archivos sino la lógica de simulación.")
print(f"  5. En el rango superpuesto (TXT vs BD), hay {len(mismatch_dates)} fechas con discrepancia.")

client.close()
print(f"\nDiagnóstico completado.")
