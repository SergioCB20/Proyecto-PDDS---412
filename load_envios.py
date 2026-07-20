"""
Bulk load envio TXT -> PostgreSQL using psql \copy (CSV).
Usage: python3 load_envios.py
"""
import os, sys, subprocess, csv, re
from datetime import datetime, timedelta, timezone

BATCH = 10000
SUDO = "sudo -u postgres"
TXT_DIR = "/opt/tomcat11/data"
FILE_RE = re.compile(r'^_envios_([A-Z0-9]{4})_\.txt$')

def nodos():
    raw = subprocess.check_output(f'{SUDO} psql -t -A -F"," -d tasfb2b_db -c "SELECT codigo_iata,continente FROM nodos_logisticos"', shell=True, text=True)
    cont = {}
    for line in raw.strip().split('\n'):
        p = line.split(',')
        if len(p)>=2: cont[p[0]] = p[1]
    return cont

def write_batch(path, rows, mode='wb'):
    with open(path, mode) as f:
        w = csv.writer(f)
        if mode=='wb': w.writerow(['id','origen_iata','destino_iata','estado','id_externo','cantidad','fecha_ingreso','sla_comprometido','fecha_operacion'])
        for r in rows: w.writerow(r)

def main():
    cont = nodos()
    print(f"Nodos: {len(cont)}")

    eq_path = "/tmp/eq_bulk.csv"; ml_path = "/tmp/ml_bulk.csv"

    eq_total = 0; ml_total = 0
    eq_buf = []; ml_buf = []
    first_eq = True; first_ml = True
    eq_fh = open(eq_path, 'w', newline=''); ml_fh = open(ml_path, 'w', newline='')
    eq_csv = csv.writer(eq_fh); ml_csv = csv.writer(ml_fh)
    eq_csv.writerow(['id','origen_iata','destino_iata','estado','id_externo','cantidad','fecha_ingreso','sla_comprometido','fecha_operacion'])
    ml_csv.writerow(['id','codigo_maleta','equipaje_id','created_at'])

    for fname in sorted(os.listdir(TXT_DIR)):
        m = FILE_RE.match(fname)
        if not m: continue
        org = m.group(1)
        if org not in cont:
            print(f"Skip {fname}: no origin {org}"); continue
        print(f"{fname} ... ", end='', flush=True)

        with open(os.path.join(TXT_DIR, fname), 'r', encoding='utf-8') as f:
            for line in f:
                line=line.strip()
                if not line: continue
                parts=line.split('-')
                if len(parts)!=7: continue
                try:
                    ext=parts[0]; ds=parts[1]; hh=parts[2]; mm=parts[3]; dst=parts[4]; qty=int(parts[5])
                except: continue
                if dst not in cont: continue

                dt=datetime.strptime(f"{ds} {hh}:{mm}","%Y%m%d %H:%M").replace(tzinfo=timezone.utc)
                sla_h=24 if cont[org]==cont[dst] else 48
                eid=f"{uuid4()}"

                eq_csv.writerow([eid,org,dst,'REGISTRADO',ext,qty,datetime.now(timezone.utc).isoformat(),(dt+timedelta(hours=sla_h)).isoformat(),dt.isoformat()])
                eq_total+=1

                for i in range(1, qty+1):
                    mid=f"{uuid4()}"
                    code=f"MAL-{ext[:20]}-{i:0{len(str(qty))}d}"
                    ml_csv.writerow([mid,code,eid,datetime.now(timezone.utc).isoformat()])
                    ml_total+=1
                    if ml_total%50000==0: print(f"  {eq_total}e/{ml_total}m ", end='', flush=True)

    eq_fh.close(); ml_fh.close()
    print(f"\nGenerated: {eq_total}e, {ml_total}m")

    print("Loading equipajes ...", end='', flush=True)
    subprocess.run(f'{SUDO} psql -d tasfb2b_db -c "TRUNCATE maletas,segmentos_plan,planes_viaje,cola_planificacion,equipajes RESTART IDENTITY CASCADE"', shell=True, check=True, capture_output=True)
    subprocess.run(f'{SUDO} psql -d tasfb2b_db -c "\\\\copy equipajes FROM \'{eq_path}\' CSV HEADER"', shell=True, check=True)
    print(" done")

    print("Loading maletas ...", end='', flush=True)
    subprocess.run(f'{SUDO} psql -d tasfb2b_db -c "\\\\copy maletas FROM \'{ml_path}\' CSV HEADER"', shell=True, check=True)
    print(" done")

    # Verify
    cnt_eq=subprocess.check_output(f'{SUDO} psql -t -A -d tasfb2b_db -c "SELECT COUNT(*) FROM equipajes"', shell=True, text=True).strip()
    cnt_ml=subprocess.check_output(f'{SUDO} psql -t -A -d tasfb2b_db -c "SELECT COUNT(*) FROM maletas"', shell=True, text=True).strip()
    print(f"Final: {cnt_eq} equipajes, {cnt_ml} maletas")

    os.remove(eq_path); os.remove(ml_path)

from uuid import uuid4
if __name__=='__main__': main()
