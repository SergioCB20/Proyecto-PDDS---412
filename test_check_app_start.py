import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('1inf54-983-4d.inf.pucp.edu.pe', username='1inf54.983.4d', password='Bw39q25X', timeout=10)
PW = 'Bw39q25X'
DB = 'tasfb2b_db'

def run(cmd, timeout=15):
    chan = client.get_transport().open_session()
    chan.settimeout(timeout)
    chan.get_pty()
    chan.exec_command(cmd)
    return chan.makefile('r', -1).read()

# Check catalina.out for app startup
print("=== App startup from catalina.out ===")
print(run(f"echo {PW} | sudo -S grep -E 'Started BackendApplication|Flyway|Migration|V36|V37|Error|Exception' /opt/tomcat11/logs/catalina.out | tail -20", timeout=30))

# Also try checking if V37 will be applied by curl the app's health
print("\n=== Try health check with verbose ===")
print(run("curl -v http://localhost:8080/health 2>&1 | head -20", timeout=10))

# Check if there's a context path
print("\n=== Check for context path ===")
print(run(f"echo {PW} | sudo -S grep -r 'context-path' /opt/tomcat11/webapps/ROOT/WEB-INF/classes/application.properties 2>/dev/null || echo 'Not set in app props'", timeout=5))

# Check flyway for error
print("\n=== Check flyway_schema_history for V37 ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT EXISTS(SELECT 1 FROM flyway_schema_history WHERE version = '37');\" 2>&1", timeout=10))

# Check if index exists already (maybe created by V33)
print("\n=== All equipajes indexes ===")
print(run(f"echo {PW} | sudo -S -u postgres psql -d {DB} -c \"SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'equipajes';\" 2>&1", timeout=10))

client.close()
