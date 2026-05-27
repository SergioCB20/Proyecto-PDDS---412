# sse-frontend-consumo.md
> **Spec owner:** Frontend Lead
> **Estado:** Draft v1
> **Última actualización:** 27/05/2026
> **Consumidores:** Frontend devs implementan

---

## 1. Descripción

Consumo del endpoint SSE `GET /api/eventos/planificacion?token=` desde el frontend para recibir eventos de planificación en vivo durante una sesión de simulación.

El flujo se activa al entrar a la pantalla `/simulacion/[id]` y se cierra al salir de ella.

---

## 2. Conexión SSE vía `EventSource`

### 2.1 Inicio de conexión

```typescript
// lib/sse.ts
const token = getCookie('token'); // JWT almacenado en cookie HttpOnly o localStorage

const eventSource = new EventSource(
  `http://localhost:8080/api/eventos/planificacion?token=${encodeURIComponent(token)}`
);
```

### 2.2 Suscripción a eventos

| Nombre evento | Acción en frontend |
|---|---|
| `planificacion` | Actualizar métricas del dashboard (SLA, vuelos cancelados, maletas replanificadas) |
| `cancelacion` | Mostrar notificación toast + animación en el mapa del vuelo cancelado |
| `replanificacion` | Mostrar notificación toast con conteo de equipajes replanificados |
| `sesion_terminada` | Mostrar notificación + habilitar botón "Ver Reporte" |
| `heartbeat` | No mostrar nada; mantener alive la conexión |

### 2.3 Manejo de errores

- `onerror`: Reintentar conexión con backoff exponencial (3s, 6s, 12s, max 30s). Mostrar indicador de "desconectado" en UI.
- `401/403`: Redirigir a `/login`.
- `503`: Mostrar mensaje "No hay sesión activa" con opción de reintentar manual.

### 2.4 Cierre de conexión

```typescript
// Al desmontar el componente o salir de la ruta
eventSource.close();
```

---

## 3. Notificaciones

### 3.1 Componente `NotificationToast`

```typescript
// components/ui/NotificationToast.tsx
interface Notification {
  id: string;
  tipo: 'CANCELACION' | 'REPLANIFICACION' | 'SESION_TERMINADA' | 'ERROR';
  mensaje: string;
  timestamp: Date;
  accion?: {
    label: string;
    onClick: () => void;
  };
}
```

**Comportamiento:**
- Aparece en esquina superior derecha
- Auto-dismiss a los 8s (excepto `SESION_TERMINADA` que persiste)
- Máximo 3 notificaciones visibles simultáneas (cola FIFO)
- Las de tipo `ERROR` tienen fondo rojo, las demás azul

### 3.2 Toast `SESION_TERMINADA`

```typescript
{
  tipo: 'SESION_TERMINADA',
  mensaje: 'La simulación ha finalizado',
  accion: {
    label: 'Ver Reporte',
    onClick: () => router.push(`/simulacion/${sesionId}/reporte`)
  }
}
```

---

## 4. Botón "Ver Reporte"

### 4.1 Estado dinámico

| Estado sesión | Botón "Ver Reporte" |
|---|---|
| `CONFIGURADA` | Oculto |
| `EN_CURSO` | Oculto |
| `PAUSADA` | Oculto |
| `FINALIZADA` | Visible, habilitado |

### 4.2 Comportamiento

- Ubicado en el header del dashboard de simulación (`/simulacion/[id]`)
- Al hacer clic: `router.push('/simulacion/[id]/reporte')`
- También se habilita automáticamente al recibir el evento SSE `sesion_terminada` (ver toast con botón directo)

### 4.3 Página de reporte

`/simulacion/[id]/reporte` consume `GET /api/sesiones/{id}/reporte` y muestra:
- SLA incumplido (%)
- Total replanificadas
- Punto de colapso (si existe)
- Tabla/gráfico de serie temporal SLA

---

## 5. Integración en componente existente

El consumo SSE se integra en el hook `useSimulacion` (o un hook dedicado `useSSE`) dentro de la ruta `/simulacion/[id]`.

```typescript
// hooks/useSSE.ts
export function useSSE(sesionId: string) {
  const [conectado, setConectado] = useState(false);
  const [ultimoHeartbeat, setUltimoHeartbeat] = useState<Date | null>(null);

  // ... lógica de conexión, reconexión, cierre

  return {
    conectado,
    ultimoHeartbeat,
  };
}
```

---

## 6. Constantes y configuración

| Parámetro | Valor |
|---|---|
| URL base SSE | `http://localhost:8080/api/eventos/planificacion` |
| Tiempo máximo sin heartbeat | 90s (considerar desconectado) |
| Backoff inicial reconexión | 3s |
| Backoff máximo reconexión | 30s |
| Máximo notificaciones visibles | 3 |
| Auto-dismiss notificaciones | 8s |
