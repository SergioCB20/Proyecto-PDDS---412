#!/usr/bin/env python3
"""
actualizar-capacidades.py  --  Update airport capacities from the data txt file.

Reads the UTF-16 BE aeropuertos file, parses IATA + CAPACIDAD,
uploads to server, and calls the API for each airport.

Usage:
    python actualizar-capacidades.py [--file PATH] [--dry-run]
"""

import argparse, os, re, shlex, sys, time

import paramiko

HOST = "1inf54-983-4d.inf.pucp.edu.pe"
USER = "1inf54.983.4d"
PW = "Bw39q25X"
API_BASE = "http://localhost:8080/api/operacion/nodo"
DEFAULT_FILE = os.path.expanduser(
    "~/Documents/2026-1/PDDS/datos aeropuertos/"
    "c.1inf54.26.1.v1.Aeropuerto.husos.v1.20250818__estudiantes.txt"
)

def run(ssh, cmd, timeout=15, retries=2):
    stripped = cmd.lstrip()
    if stripped.startswith("sudo"):
        rest = stripped[4:].lstrip()
        cmd = f"echo {shlex.quote(PW)} | sudo -S {rest}"
    for attempt in range(retries):
        try:
            chan = ssh.get_transport().open_session()
            chan.settimeout(timeout)
            chan.get_pty()
            chan.exec_command(cmd)
            raw = chan.makefile("r", -1).read()
            if isinstance(raw, bytes):
                raw = raw.decode(errors="replace")
            try:
                raw.encode(sys.stdout.encoding)
            except (UnicodeEncodeError, UnicodeDecodeError):
                raw = raw.encode(sys.stdout.encoding, errors="replace").decode(sys.stdout.encoding)
            return raw
        except Exception as e:
            if attempt == 0:
                time.sleep(2)
                continue
            return f"TIMEOUT/ERROR: {e}\n"
    return ""

def parse_capacidades(filepath):
    pairs = []
    with open(filepath, encoding="utf-16-be") as f:
        for line in f:
            line = line.strip()
            if not re.match(r"^\s*\d+\s+[A-Z]{4}\s+", line):
                continue
            # Take everything before "Latitude:" — last token is Capacity
            before_lat = line.split("Latitude:")[0].strip()
            parts = before_lat.split()
            if len(parts) < 7:
                continue
            try:
                cap = int(parts[-1])
                pairs.append((parts[1], cap))
            except ValueError:
                continue
    return pairs

def main():
    p = argparse.ArgumentParser(description="Update airport capacities from data file")
    p.add_argument("--file", default=DEFAULT_FILE, help="Path to aeropuertos .txt file")
    p.add_argument("--dry-run", action="store_true", help="Show what would be done")
    p.add_argument("--host", default=HOST)
    p.add_argument("--user", default=USER)
    p.add_argument("--password", default=PW)
    args = p.parse_args()

    # Parse local file
    if not os.path.isfile(args.file):
        print(f"[ERR] File not found: {args.file}")
        sys.exit(1)
    pares = parse_capacidades(args.file)
    if not pares:
        print("[ERR] No airport data parsed from file")
        sys.exit(1)
    print(f"[OK] Parsed {len(pares)} airports from {args.file}")
    for iata, cap in pares:
        print(f"     {iata} -> {cap}")

    if args.dry_run:
        print("\n[OK] Dry-run complete. No changes.")
        sys.exit(0)

    # SSH connect
    print(f"\nConnecting to {args.host} ...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(args.host, username=args.user, password=args.password, timeout=15)
        print("[OK] Connected")
    except Exception as e:
        print(f"[ERR] SSH failed: {e}")
        sys.exit(1)

    # SFTP upload the file
    remote_tmp = f"/tmp/aeropuertos_datos.txt"
    try:
        sftp = client.open_sftp()
        sftp.put(args.file, remote_tmp)
        sftp.close()
        print(f"[OK] Uploaded to {remote_tmp}")
    except Exception as e:
        print(f"[ERR] SFTP upload failed: {e}")
        client.close()
        sys.exit(1)

    # Convert UTF-16 BE to UTF-8 on server, then parse and curl
    ok = 0
    err = 0
    for iata, cap in pares:
        code = run(client,
            f"curl -s -o /dev/null -w '%{{http_code}}' -X POST "
            f"{API_BASE}/{iata}/capacidad "
            f"-H 'Content-Type: application/json' "
            f"-d '{{\"capacidad\": {cap}}}'",
            timeout=10).strip()
        if code == "200":
            print(f"  [OK] {iata} = {cap}")
            ok += 1
        else:
            print(f"  [ERR] {iata} = {cap}  HTTP {code}")
            err += 1
        time.sleep(0.2)

    # Cleanup
    run(client, f"rm -f {remote_tmp}", timeout=5)
    client.close()

    print(f"\nDone. {ok} updated, {err} errors.")
    sys.exit(1 if err else 0)

if __name__ == "__main__":
    main()
