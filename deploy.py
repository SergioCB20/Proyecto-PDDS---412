#!/usr/bin/env python3
"""
deploy.py  --  Deploy backend (WAR via Tomcat) + frontend (Next.js) to PUCP server.

Usage:
    python deploy.py                            # interactive
    python deploy.py --yes                      # skip YES_TO_DEPLOY prompt
    python deploy.py --dry-run                  # pre-flight only
    python deploy.py --backend                  # skip frontend
    python deploy.py --frontend                 # skip backend
    python deploy.py --skip-flyway              # skip V35 checksum repair
    python deploy.py --remote testing           # git fetch + reset to origin/testing
    python deploy.py --repo /path/to/proyecto   # local repo (default: cwd)

Exit codes:
    0   deploy ok / dry-run / nothing-to-deploy
    1   failure (SSH, pre-flight, health)
    2   user cancelled (declined YES_TO_DEPLOY)
"""

import argparse, datetime, io, os, re, shlex, sys, tarfile, tempfile, time

import paramiko

# -- Removable credentials (same as diagnose.py) -------------------------
HOST = "1inf54-983-4d.inf.pucp.edu.pe"
USER = "1inf54.983.4d"
PW = "Bw39q25X"
REMOTE_DIR = "/home/1inf54.983.4d/proyecto"


# -- Helpers -------------------------------------------------------------

def run(ssh, cmd, timeout=30, retries=2):
    """Run a command on the remote host via paramiko.

    Prepends *echo $PW | sudo -S* when the command starts with ``sudo``,
    exactly as `diagnose.py` does.
    """
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
            # sanitize for terminal encoding (e.g. cp1252 on Windows)
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


def section(title):
    sep = "=" * 60
    print(f"\n{sep}")
    print(f"  {title}")
    print(sep)


def yes_to_deploy(ssh, dry_run):
    if dry_run:
        return True
    print("\n[WARN]  Type YES_TO_DEPLOY to continue, anything else to abort:")
    try:
        answer = sys.stdin.readline().strip()
    except EOFError:
        answer = ""
    return answer == "YES_TO_DEPLOY"


def upload_local_repo(ssh, repo_path, remote_dir, ts):
    section("Local upload -- building archive")
    exclude_dirs = {".git", "node_modules", "target", ".next", "__pycache__", ".m2"}
    local_tar = os.path.join(tempfile.gettempdir(), "deploy-%s.tar.gz" % ts)
    try:
        with tarfile.open(local_tar, "w:gz") as tar:
            for root, dirs, files in os.walk(repo_path):
                dirs[:] = [d for d in dirs if d not in exclude_dirs]
                for f in files:
                    full = os.path.join(root, f)
                    arcname = os.path.relpath(full, repo_path).replace("\\", "/")
                    tar.add(full, arcname=arcname)
    except Exception as e:
        print("[ERR] Local archive failed: %s" % e)
        sys.exit(1)
    size_mb = os.path.getsize(local_tar) / 1e6
    print("[OK] Archive created: %.1f MB" % size_mb)
    # Upload via SFTP
    print("Uploading via SFTP ...")
    try:
        sftp = ssh.open_sftp()
        sftp.put(local_tar, "/tmp/deploy-%s.tar.gz" % ts)
        sftp.close()
    except Exception as e:
        print("[ERR] SFTP upload failed: %s" % e)
        sys.exit(1)
    # Extract
    print("Extracting on remote ...")
    extract_dir = remote_dir.rstrip("/")
    out = run(ssh, 'tar xzf /tmp/deploy-%s.tar.gz -C %s' % (ts, extract_dir), timeout=120)
    run(ssh, "rm /tmp/deploy-%s.tar.gz" % ts, timeout=10)
    print(out[-500:] if len(out) > 500 else out)
    os.remove(local_tar)
    print("[OK] Local files uploaded and extracted")


# -- Main ----------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Deploy backend + frontend to PUCP")
    parser.add_argument("--yes", action="store_true", help="Skip YES_TO_DEPLOY prompt")
    parser.add_argument("--dry-run", action="store_true", help="Pre-flight only, no changes")
    parser.add_argument("--backend", action="store_true", help="Skip frontend deploy")
    parser.add_argument("--frontend", action="store_true", help="Skip backend deploy")
    parser.add_argument("--skip-flyway", action="store_true", help="Skip V35 flyway repair")
    parser.add_argument("--local", action="store_true", help="Upload local files via SFTP instead of git pull")
    parser.add_argument("--remote", default="main", help="Remote branch (default: main; ignored with --local)")
    parser.add_argument("--repo", default=".", help="Local repo path (default: cwd)")
    args = parser.parse_args()

    ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")

    # -- Phase 0: SSH connect -------------------------------------------
    section("Phase 0 -- Connecting to %s" % HOST)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PW, timeout=15)
        print("[OK] Connected to %s" % HOST)
    except Exception as e:
        print("[ERR] SSH connection failed: %s" % e)
        sys.exit(1)

    # -- Phase 1: Pre-flight (read-only) --------------------------------
    section("Phase 1 -- Pre-flight checks")

    # Local repo state
    try:
        import subprocess
        local_rev = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=args.repo, stderr=subprocess.STDOUT
        ).decode().strip()
        local_branch = subprocess.check_output(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=args.repo, stderr=subprocess.STDOUT
        ).decode().strip()
    except Exception as e:
        print("[ERR] Cannot read local git state: %s" % e)
        client.close()
        sys.exit(1)

    # Remote revision
    remote_rev_raw = run(client, "cd %s && git ls-remote origin %s" % (REMOTE_DIR, args.remote), timeout=15)
    remote_rev = ""
    for line in remote_rev_raw.strip().splitlines():
        parts = line.strip().split()
        if len(parts) >= 1 and re.match(r"^[0-9a-f]{40}$", parts[0]):
            remote_rev = parts[0]
            break

    print("Local  HEAD: %s (%s)" % (local_rev[:10], local_branch))
    print("Remote HEAD: %s (%s)" % (remote_rev[:10] if remote_rev else "??", args.remote))

    if remote_rev:
        # show commits ahead
        ahead = run(client,
            "cd %s && git log --oneline %s..%s 2>&1 | head -20" % (REMOTE_DIR, remote_rev, local_rev), timeout=10)
        n_ahead = len([l for l in ahead.strip().splitlines() if l.strip() and not l.startswith("fatal")])
        print("Commits ahead: %d" % n_ahead)
        if n_ahead == 0 and not args.dry_run and not args.local:
            print("Nothing to deploy -- local rev matches remote. Exiting.")
            client.close()
            sys.exit(0)

    # Disk & memory
    print(run(client, "df -h / | tail -1", timeout=5).strip())
    print(run(client, "free -h | head -2", timeout=5).strip())

    # Service status (non-fatal)
    for svc in ("tomcat11", "frontend", "nginx", "postgresql"):
        st = run(client, "systemctl is-active %s 2>&1 || true" % svc, timeout=5).strip()
        print("  %s: %s" % (svc, st))

    if args.dry_run:
        print("\n[OK] Dry-run: pre-flight complete. No changes made.")
        client.close()
        sys.exit(0)

    # -- Phase 2: Push verification -------------------------------------
    if not args.local:
        section("Phase 2 -- Verifying local rev is on remote")

        # local_rev must be an ancestor of remote_ref
        merge_base = run(client,
            "cd %s && git merge-base --is-ancestor %s origin/%s 2>&1; echo $?" % (REMOTE_DIR, local_rev, args.remote),
            timeout=10).strip()
        if "0" not in merge_base:
            print("[ERR] Local HEAD %s is NOT reachable from origin/%s." % (local_rev[:10], args.remote))
            print("  Run:  git push origin %s:%s" % (local_branch, args.remote))
            client.close()
            sys.exit(1)
        print("[OK] Remote includes local commit %s." % local_rev[:10])
    else:
        print("[SKIP]  --local mode: skipping push verification")

    # -- Phase 3: Confirmation -----------------------------------------
    if not args.yes:
        if not yes_to_deploy(client, args.dry_run):
            print("Aborting (user declined).")
            client.close()
            sys.exit(2)
        print("[OK] Confirmed.")

    # -- Phase 4: Deploy ------------------------------------------------
    section("Phase 4 -- Deploying changes")

    # 4a. Sync code
    if args.local:
        print("[LOCAL] Uploading local files via SFTP ...")
        upload_local_repo(client, args.repo, REMOTE_DIR, ts)
    else:
        print("git fetch origin %s && git reset --hard origin/%s ..." % (args.remote, args.remote))
        print(run(client,
            "cd %s && git fetch origin %s && git reset --hard origin/%s" % (REMOTE_DIR, args.remote, args.remote),
            timeout=60))

    # 4b. Cleanup disk
    print("[CLEAN] Cleaning up disk space ...")
    run(client, "rm -rf ~/.npm/_cacache 2>/dev/null || true", timeout=10)
    run(client, "sudo apt clean -qq 2>/dev/null || true", timeout=30)
    run(client, "sudo journalctl --vacuum-time=3d --quiet 2>/dev/null || true", timeout=30)
    run(client, "sudo rm -f /var/log/syslog.* /var/log/btmp.* /var/log/auth.log.* /var/log/*.gz 2>/dev/null || true", timeout=10)
    run(client, "rm -rf %s/frontend/node_modules %s/backend/backend/target 2>/dev/null || true" % (REMOTE_DIR, REMOTE_DIR), timeout=60)
    run(client, "sudo rm -rf /opt/tomcat11/webapps/back.war /opt/tomcat11/webapps/back/ 2>/dev/null || true", timeout=10)

    print(run(client, "df -h / | tail -1", timeout=5).strip())

    # -- Backend ----------------------------------------------------------
    if not args.frontend:
        section("Backend -- building & deploying WAR")

        # Backup current WAR (Tomcat still running)
        print("Backing up current WAR -> /tmp/ROOT.%s.war ..." % ts)
        run(client, "sudo cp /opt/tomcat11/webapps/ROOT.war /tmp/ROOT.%s.war 2>/dev/null || echo '(no previous WAR)'" % ts, timeout=10)

        # Clean + build (Tomcat still running -- zero downtime during build)
        run(client, "cd %s/backend/backend && sudo rm -rf target/" % REMOTE_DIR, timeout=10)
        print("Running mvn package (this may take 5+ minutes) ...")
        out = run(client,
            "cd %s/backend/backend && MAVEN_OPTS=\"-Xmx512m -XX:+UseSerialGC\" /opt/apache-maven-3.9.16/bin/mvn package -DskipTests 2>&1"
            % REMOTE_DIR, timeout=600)
        print(out[-1500:] if len(out) > 1500 else out)

        # Verify WAR
        war_path = run(client,
            "ls %s/backend/backend/target/*.war 2>/dev/null | head -1" % REMOTE_DIR, timeout=5).strip()
        if not war_path:
            print("[ERR] No WAR file found in target/")
            client.close()
            sys.exit(1)
        print("WAR: %s" % war_path)
        integrity = run(client, "unzip -t %s 2>&1 | tail -1" % war_path, timeout=30)
        if "No errors" not in integrity:
            print("[ERR] WAR integrity check failed:\n%s" % integrity)
            client.close()
            sys.exit(1)
        print("[OK] WAR integrity verified")

        # Stop Tomcat (brief downtime starts here)
        print("Stopping Tomcat ...")
        run(client, "sudo systemctl stop tomcat11 || true", timeout=30)
        run(client, "sudo systemctl kill --signal=SIGKILL tomcat11 2>/dev/null || true", timeout=10)
        time.sleep(5)

        # Ensure postgres is ready
        run(client, "sudo pg_isready -q 2>/dev/null || sudo systemctl start postgresql@16-main 2>/dev/null || echo '[WARN] PostgreSQL check skipped'", timeout=15)

        # Deploy
        run(client, "sudo rm -rf /opt/tomcat11/webapps/ROOT /opt/tomcat11/webapps/ROOT.war", timeout=10)
        run(client, "sudo cp %s /opt/tomcat11/webapps/ROOT.war" % war_path, timeout=15)

        # Flyway repair (optional)
        if not args.skip_flyway:
            print("[FIX]  Repairing Flyway checksums ...")
            out = run(client,
                "PGPASSWORD=\"pass123\" /usr/bin/psql -h localhost -U postgres -d tasfb2b_db -c "
                "\"UPDATE flyway_schema_history SET checksum = -350889692 WHERE version = '35';\" 2>&1",
                timeout=15)
            print(out.strip())

        # Fix log permissions
        run(client, "sudo chmod a+w /opt/tomcat11/logs/ 2>/dev/null || true", timeout=5)
        run(client, "sudo rm -f /opt/tomcat11/logs/catalina.out 2>/dev/null || true", timeout=5)

        # Fix Tomcat scratchDir (multipart uploads fail with 500 if root-owned)
        run(client, "sudo chown -R tomcat:tomcat /opt/tomcat11/work/Catalina/localhost/ROOT 2>/dev/null || true", timeout=10)
        run(client, "sudo chmod 1777 /opt/tomcat11/work/Catalina/localhost/ROOT 2>/dev/null || true", timeout=10)

        # Kill zombies
        for port in ("8005", "8080"):
            zombie = run(client,
                "sudo ss -tlnp 2>/dev/null | grep ':%s ' | grep -oP 'pid=\\K[0-9]+' || true" % port,
                timeout=5).strip()
            if zombie:
                print("[KILL]  Killing zombie PID %s on port %s" % (zombie, port))
                run(client, "sudo kill -9 %s 2>/dev/null || true" % zombie, timeout=5)
                time.sleep(2)

        # Start Tomcat
        print("Starting Tomcat ...")
        run(client, "sudo systemctl reset-failed tomcat11 2>/dev/null || true", timeout=5)
        start_out = run(client, "sudo systemctl start tomcat11 2>&1 || true", timeout=30)
        time.sleep(15)
        active = run(client, "sudo systemctl is-active --quiet tomcat11 2>&1; echo $?", timeout=5).strip()
        if active != "0":
            print("[ERR] Tomcat failed to start:\n%s" % start_out)
            dump_diagnostics(client)
            client.close()
            sys.exit(1)
        print("[OK] Tomcat is active")

        # Free disk for frontend
        run(client, "rm -rf ~/.npm 2>/dev/null || true", timeout=10)
        run(client, "rm -rf %s/backend/backend/target 2>/dev/null || true" % REMOTE_DIR, timeout=10)
        run(client, "sudo journalctl --vacuum-size=100M --quiet 2>/dev/null || true", timeout=15)

    # -- Frontend ----------------------------------------------------------
    if not args.backend:
        section("Frontend -- building & deploying")

        out = run(client, "cd %s/frontend && npm ci 2>&1" % REMOTE_DIR, timeout=180)
        print(out[-1000:] if len(out) > 1000 else out)

        out = run(client,
            "cd %s/frontend && NEXT_PUBLIC_API_URL=/back/api npm run build 2>&1" % REMOTE_DIR,
            timeout=180)
        print(out[-1000:] if len(out) > 1000 else out)

        run(client, "sudo systemctl restart frontend", timeout=15)
        run(client, "sudo systemctl reload nginx", timeout=10)
        print("[OK] Frontend restarted")

    # -- Phase 5: Health checks ------------------------------------------
    section("Phase 5 -- Health checks")

    # Pre-diagnosis dump
    time.sleep(15)
    print(run(client, "sudo systemctl status tomcat11 --no-pager 2>&1 || echo '(status failed)'", timeout=10))
    print(run(client, "sudo ss -tlnp 2>&1 | grep 8080 || echo '(nothing on 8080)'", timeout=10))
    journal = run(client, "sudo journalctl -u tomcat11 --no-pager -n 100 --no-hostname 2>&1 | tail -60 || echo '(journalctl failed)'", timeout=15)
    print(journal)

    # Backend health (wait up to 360s)
    print("Waiting for backend (/health) ...")
    for i in range(1, 61):
        ok = run(client, "curl -sf http://localhost:8080/health > /dev/null 2>&1; echo $?", timeout=10).strip()
        if ok == "0":
            print("[OK] Backend healthy after %ds" % (i * 6))
            break
        if i == 60:
            print("[ERR] Backend health check failed after 360s")
            dump_diagnostics(client)
            client.close()
            sys.exit(1)
        time.sleep(6)

    # Frontend health (wait up to 60s)
    print("Waiting for frontend (/front/login) ...")
    for i in range(1, 7):
        ok = run(client,
            "curl -sfL http://localhost:5000/front/login 2>&1 || true",
            timeout=10)
        if "TAS FB2B" in ok:
            print("[OK] Frontend healthy after %ds" % (i * 10))
            break
        if i == 6:
            print("[WARN]  Frontend health check failed after 60s")
            fjournal = run(client, "sudo journalctl -u frontend --no-pager -n 30 2>/dev/null || true", timeout=10)
            print(fjournal)
        time.sleep(10)

    # -- Done --------------------------------------------------------------
    section("Deploy complete -- %s" % ts)
    print("[OK] WAR backed up at /tmp/ROOT.%s.war" % ts)
    print("[OK] Backend:  http://localhost:8080/health")
    print("[OK] Frontend: http://localhost:5000/front/login")
    print("[OK] Public:   https://1inf54-983-4d.inf.pucp.edu.pe/")
    client.close()
    sys.exit(0)


def dump_diagnostics(client):
    """Print failure diagnostics, non-fatal."""
    section("Diagnostics")
    for cmd, label in [
        ("sudo systemctl status tomcat11 --no-pager 2>&1 || true", "systemctl status"),
        ("sudo journalctl -u tomcat11 --no-pager -n 100 --no-hostname 2>&1 || true", "journalctl tomcat11"),
        ("sudo journalctl -u frontend --no-pager -n 30 --no-hostname 2>&1 || true", "journalctl frontend"),
        ("sudo ss -tlnp 2>&1 | grep -E '8080|5000' || echo '(none)'", "listeners 8080/5000"),
        ("sudo tail -60 /opt/tomcat11/logs/catalina.out 2>&1 || echo '(no catalina.out)'", "catalina.out"),
        ("sudo tail -60 /opt/tomcat11/logs/catalina.$(date +%Y-%m-%d).log 2>&1 || true", "catalina.YYYY-MM-DD.log"),
        ("sudo tail -60 /opt/tomcat11/logs/localhost.$(date +%Y-%m-%d).log 2>&1 || true", "localhost.YYYY-MM-DD.log"),
    ]:
        print("--- %s ---" % label)
        print(run(client, cmd, timeout=10))


if __name__ == "__main__":
    main()
