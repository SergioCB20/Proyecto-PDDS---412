## 1. Backend — OperacionTickService

- [ ] 1.1 Agregar campo `diaProcesado: LocalDate` inicializado en `null`
- [ ] 1.2 Cambiar `@Scheduled(fixedRate = 5000)` a `@Scheduled(fixedDelay = 1000)`
- [ ] 1.3 Envolver el bloque de reseteo/clonado con `if (!today.equals(diaProcesado))` y asignar `diaProcesado = today` después

## 2. Backend — OperacionTelemetriaService

- [ ] 2.1 Agregar `@Async` al método `emitirTelemetria()`
- [ ] 2.2 Verificar que `@EnableAsync` ya está presente en `BackendApplication.java`

## 3. Backend — TelemetriaWebSocket (Heartbeat)

- [ ] 3.1 Agregar método `@Scheduled(fixedRate = 10000) public void heartbeat()` que emite `{"type":"heartbeat"}` si hay sesiones conectadas

## 4. Frontend — useTelemetria.ts

- [ ] 4.1 Agregar filtro en `onmessage` para ignorar mensajes con `type === 'heartbeat'`

## 5. Infraestructura — Nginx

- [ ] 5.1 Agregar `proxy_read_timeout 3600s;` en el bloque `location /back/` de Nginx en el servidor
- [ ] 5.2 Recargar Nginx: `sudo systemctl reload nginx`

## 6. Verificación

- [ ] 6.1 Hacer build del backend y desplegar en Tomcat
- [ ] 6.2 Hacer build del frontend y reiniciar servicio
- [ ] 6.3 Verificar que el WS se mantiene conectado por >5 minutos en operación
- [ ] 6.4 Verificar que no hay errores de broadcast en logs de Tomcat
