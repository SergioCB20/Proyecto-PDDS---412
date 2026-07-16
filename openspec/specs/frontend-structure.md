# frontend-structure.md

> **Spec owner:** PM/Lead  
> **Estado:** Draft v1  
> **Última actualización:** 2025  
> **Implementado por:** Frontend Dev

---

## Stack

| Tecnología | Versión | Rol |
|---|---|---|
| Next.js | 16.x | Framework React con App Router |
| TypeScript | 5.x | Tipado estático |
| Tailwind CSS | 4.x | Estilos |
| Recharts | latest | Gráfico SLA vs Tiempo |
| React-Leaflet | latest | Mapa interactivo (post-entrega) |

---

## Estructura de carpetas

```
frontend/
├── app/
│   ├── layout.tsx                  ← Layout global con navegación por rol
│   ├── page.tsx                    ← Redirige a /login si no hay token
│   ├── login/
│   │   └── page.tsx                ← Pantalla de login
│   ├── simulacion/
│   │   ├── page.tsx                ← Configuración de sesión (Analista)
│   │   └── [id]/
│   │       ├── page.tsx            ← Simulación en vivo con métricas
│   │       └── reporte/
│   │           └── page.tsx        ← Reporte final con gráfico SLA
│   └── equipajes/
│       └── page.tsx                ← Registro de equipaje (Operador)
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── Badge.tsx
│   ├── MetricasPanel.tsx           ← Panel de métricas en vivo
│   ├── GraficoSLA.tsx              ← Gráfico SLA vs Tiempo (Recharts)
│   └── SimulacionControles.tsx     ← Botones iniciar/pausar/detener
├── hooks/
│   ├── useAuth.ts                  ← Manejo de JWT y sesión
│   ├── useMetricas.ts              ← Polling cada 3s a GET /sesiones/{id}/metricas
│   └── useVuelos.ts                ← Consulta de vuelos con filtros
├── lib/
│   ├── api.ts                      ← Cliente HTTP base con Fetch API
│   ├── auth.ts                     ← Helper para token: get/set/clear
│   └── types.ts                    ← Tipos TypeScript de los contratos API
└── middleware.ts                   ← Protección de rutas por rol
```

---

## Cliente HTTP base (`lib/api.ts`)

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
};
```

---

## Variables de entorno (`.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

---

## Manejo de autenticación (`lib/auth.ts`)

```typescript
export const auth = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token: string) => localStorage.setItem('token', token),
  clearToken: () => localStorage.removeItem('token'),
  getUser: () => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },
  setUser: (user: object) => localStorage.setItem('user', JSON.stringify(user)),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
};
```

---

## Middleware de protección de rutas (`proxy.ts`)

Next.js 16 uses `proxy.ts` as the middleware convention (the `middleware.ts` file convention is deprecated). The middleware is defined in `frontend/proxy.ts` and handles role-based route protection with JWT stored in a cookie named `token`. The base path is `/front`.

```typescript
import { NextRequest, NextResponse } from 'next/server';

const RUTAS_PUBLICAS = ['/login'];

const RUTAS_POR_ROL: Record<string, string[]> = {
  ANALISTA: ['/simulacion'],
  OPERADOR_LOGISTICO: ['/equipajes'],
  ADMINISTRADOR: ['/usuarios'],
};

export function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;

  if (RUTAS_PUBLICAS.includes(pathname)) return NextResponse.next();
  if (!token) return NextResponse.redirect(new URL('/login', req.url));

  return NextResponse.next();
}
```

---

## Hook de métricas en vivo (`hooks/useMetricas.ts`)

```typescript
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export function useMetricas(sesionId: string, activa: boolean) {
  const [metricas, setMetricas] = useState(null);

  useEffect(() => {
    if (!activa) return;
    const interval = setInterval(async () => {
      try {
        const data = await api.get(`/sesiones/${sesionId}/metricas`);
        setMetricas(data);
      } catch (e) {
        console.error('Error al obtener métricas:', e);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [sesionId, activa]);

  return metricas;
}
```

---

## Pantallas y responsabilidades

### `/login`
- Formulario con campos `correo` y `password`.
- POST a `/auth/login`.
- Al recibir respuesta, guardar token y usuario en localStorage.
- Redirigir según rol:
  - ADMINISTRADOR → `/usuarios`
  - OPERADOR_LOGISTICO → `/equipajes`
  - ANALISTA → `/simulacion`

### `/equipajes` (Operador Logístico)
- Formulario de registro unitario: `id_equipaje`, `destino_iata`, `vuelo_id`, `sla_comprometido`.
- Select de vuelos obtenido de GET `/vuelos?estado=PROGRAMADO`.
- Al confirmar → POST `/equipajes`.
- Mostrar respuesta: estado del equipaje y segmentos del plan de viaje.

### `/simulacion` (Analista)
- Formulario de configuración:
  - `fecha_inicio_virtual` (date picker)
  - `hora_inicio_virtual` (time picker)
  - `prob_cancelacion` (slider 0-100%)
  - Umbrales almacén: verde_max, ambar_max (rojo = resto)
  - Umbrales vuelo: verde_max, ambar_max
- Al confirmar → POST `/sesiones`.
- Redirigir a `/simulacion/{id}`.

### `/simulacion/[id]` (Analista)
- Panel de métricas en vivo (polling cada 3s):
  - Día/hora virtual
  - Tiempo real transcurrido (contador en pantalla)
  - SLA acumulado %
  - Vuelos cancelados
  - Maletas replanificadas
- Botones: **Iniciar** / **Pausar** / **Detener**
- Al detectar estado `FINALIZADA` → mostrar botón "Ver reporte" → redirigir a `/simulacion/{id}/reporte`

### `/simulacion/[id]/reporte` (Analista)
- Tarjetas de resumen:
  - SLA incumplido %
  - Total maletas replanificadas
  - Punto de colapso (si hubo)
  - Causa de colapso (si hubo)
- Gráfico SLA vs Tiempo (Recharts `LineChart`):
  - Eje X: `momento_virtual`
  - Eje Y: `sla_pct` (0-100%)
  - Marcadores rojos: puntos donde `hubo_cancelacion = true`

---

## Requisitos Adicionales

### Requirement: Timeout en cliente HTTP
El cliente HTTP (`lib/api.ts`) SHALL tener un timeout configurado de 15 segundos para todas las peticiones REST. Si el servidor no responde en ese plazo, la petición SHALL ser abortada y el error propagado al caller.

#### Scenario: Timeout superado en GET
- **WHEN** una petición GET demora más de 15 segundos en responder
- **THEN** el fetch SHALL ser abortado y la promesa rechazada con un `AbortError`

#### Scenario: Timeout superado en POST
- **WHEN** una petición POST demora más de 15 segundos en responder
- **THEN** el fetch SHALL ser abortado y la promesa rechazada con un `AbortError`

#### Scenario: Timeout aplica a upload y downloadBlob
- **WHEN** se usa `api.upload()` o `api.downloadBlob()`
- **THEN** ambos métodos SHALL respetar el timeout de 15 segundos

### Requirement: Runtime validation for estado fields from backend

Every `estado` field received from the backend (via REST, WebSocket, or SSE) that maps to a TypeScript union literal type SHALL be validated at runtime before use. A helper function SHALL check the value against the known valid values and provide a safe fallback for unrecognized values.

#### Scenario: Valid estado value received
- **WHEN** the backend sends a `VueloTelemetria` with `estado: "EN_RUTA"` via WebSocket
- **THEN** the runtime validator SHALL recognize `"EN_RUTA"` as valid
- **THEN** the typed value `"EN_RUTA"` SHALL be returned

#### Scenario: Unknown estado value received
- **WHEN** the backend sends a `VueloTelemetria` with `estado: "DESVIADO"` (not in the known union)
- **THEN** the runtime validator SHALL return the fallback value `"PROGRAMADO"`
- **THEN** the system SHALL NOT crash or render an invalid state

#### Scenario: Helper signature
- **WHEN** the helper function is called with any string
- **THEN** it SHALL return a value of the expected union type (`'PROGRAMADO' | 'EN_RUTA' | 'CANCELADO' | 'COMPLETADO'`)
- **THEN** TypeScript SHALL recognize the return type as the union, not `string`

### Requirement: Suspense boundary en página de reporte
La página `app/simulacion/[id]/reporte/page.tsx` SHALL estar envuelta en un `<Suspense>` boundary de React para permitir la resolución asíncrona de `useParams()` en Next.js 16.

#### Scenario: Carga de reporte con Suspense
- **WHEN** un usuario navega a `/simulacion/{id}/reporte`
- **THEN** el componente SHALL mostrar un fallback de carga mientras `useParams()` resuelve
- **THEN** el componente SHALL renderizar el contenido completo del reporte una vez resuelto

---

## Tipos TypeScript principales (`lib/types.ts`)

```typescript
export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: 'ADMINISTRADOR' | 'OPERADOR_LOGISTICO' | 'ANALISTA';
  nodo_ref_id: string;
}

export interface Vuelo {
  id: string;
  codigo_vuelo: string;
  estado: 'PROGRAMADO' | 'EN_RUTA' | 'CANCELADO' | 'COMPLETADO';
  origen: { id: string; codigo_iata: string; nombre: string };
  destino: { id: string; codigo_iata: string; nombre: string };
  hora_salida: string;
  hora_llegada: string;
  capacidad_carga: number;
  carga_disponible: number;
}

export interface MetricasEnVivo {
  sesion_id: string;
  estado: string;
  dia_hora_virtual: string;
  segundos_reales_transcurridos: number;
  sla_acumulado_pct: number;
  vuelos_cancelados: number;
  maletas_replanificadas: number;
}

export interface PuntoSLA {
  momento_virtual: string;
  sla_pct: number;
  hubo_cancelacion: boolean;
  vuelo_cancelado_ref_id?: string;
}

export interface ReporteSesion {
  sesion_id: string;
  sla_incumplido_pct: number;
  total_replanificadas: number;
  punto_colapso_virtual: string | null;
  nodo_colapso_ref_id: string | null;
  causa_colapso: string | null;
  serie_sla: PuntoSLA[];
}

export interface SesionConfig {
  tipo: 'SIMULADA';
  fecha_inicio_virtual: string;
  hora_inicio_virtual: string;
  prob_cancelacion: number;
  umbrales_almacen: Umbrales;
  umbrales_vuelo: Umbrales;
}

export interface Umbrales {
  verde_min: number;
  verde_max: number;
  ambar_min: number;
  ambar_max: number;
  rojo_min: number;
  rojo_max: number;
}
```

---

## Mock JWT (para desarrollo sin backend listo)

Mientras el backend no esté disponible, P3 puede usar este mock en `lib/auth.ts`:

```typescript
export const MOCK_USERS = {
  'admin@tasfb2b.com': { rol: 'ADMINISTRADOR', nombre: 'Admin Sistema' },
  'operador@tasfb2b.com': { rol: 'OPERADOR_LOGISTICO', nombre: 'Operador Lima' },
  'analista@tasfb2b.com': { rol: 'ANALISTA', nombre: 'Analista Sim' },
};

// Reemplazar POST /auth/login con mock local:
export async function loginMock(correo: string) {
  const user = MOCK_USERS[correo];
  if (!user) throw new Error('Usuario no encontrado');
  auth.setToken('mock-token-' + user.rol);
  auth.setUser({ ...user, correo, id: 'mock-id', nodo_ref_id: 'mock-nodo' });
  return user;
}
```

> **Importante:** Eliminar el mock y conectar al endpoint real en cuanto el backend esté disponible.

---

## Dependencias a instalar

```bash
npm install recharts
npm install react-leaflet leaflet     # solo si se implementa el mapa
npm install @types/leaflet            # solo si se implementa el mapa
```

---

## Componente: DetalleEnviosAeropuerto

**Ubicación:** `frontend/components/operacion/DetalleEnviosAeropuerto.tsx`

Renderiza el panel de detalle de envíos para un aeropuerto seleccionado.

### Props
- `iata: string` — Código IATA del aeropuerto
- `onSeguirEnMapa?: (vueloId: string) => void`
- `onMostrarRuta?: (segmentos: SegmentoResponse[]) => void`

### Estados
- **Carga:** Spinner + "Cargando envíos..."
- **Vacío:** "Sin envíos registrados en este aeropuerto"
- **Error:** Mensaje de error con el detalle

### Estructura
- Contenedor con borde y fondo distintivo
- Título: "Aeropuerto {iata} — Detalle de Envíos"
- Subsección "Saliendo" con encabezado "🔴 Saliendo (X envíos · Y maletas)"
- Subsección "Llegando" con encabezado "🟢 Llegando (X envíos · Y maletas)"
- Cada envío expandible para ver maletas individuales
- Botones de acción: Seguir, Ruta, PDF

## Nuevos tipos en types.ts

```typescript
interface EnvioNodoDetalle {
  id: string;
  codigo_equipaje: string;
  origen_iata: string;
  destino_iata: string;
  cantidad: number;
  estado: string;
  codigo_vuelo: string;
  fecha_ingreso: string;
  maletas: Maleta[];
}

interface ConteoNodo {
  saliendo_envios: number;
  saliendo_maletas: number;
  llegando_envios: number;
  llegando_maletas: number;
}

interface NodoEnviosResponse {
  nodo_iata: string;
  saliendo: EnvioNodoDetalle[];
  llegando: EnvioNodoDetalle[];
  conteo: ConteoNodo;
}
```

### Nueva función en api.ts
```typescript
fetchEnviosNodoConClasificacion(iata: string): Promise<NodoEnviosResponse>
```
Hace `GET /api/nodos/{iata}/envios` y retorna `NodoEnviosResponse`.
