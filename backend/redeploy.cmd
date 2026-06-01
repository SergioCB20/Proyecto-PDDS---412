@echo off
REM Reconstruye el WAR localmente y lo despliega en el contenedor en ejecucion
REM Sin necesidad de rebuild de Docker (~30s vs ~5min)

echo [1/2] Construyendo WAR...
cd /d "%~dp0"
call mvnw.cmd clean package -DskipTests -q
if %ERRORLEVEL% neq 0 (
    echo ERROR: Fallo la compilacion
    exit /b 1
)

echo [2/2] Copiando WAR al contenedor...
docker cp target\*.war tasfb2b-backend:/usr/local/tomcat/webapps/ROOT.war
docker exec tasfb2b-backend rm -rf /usr/local/tomcat/webapps/ROOT

echo Listo. Tomcat redeployando el nuevo WAR...
