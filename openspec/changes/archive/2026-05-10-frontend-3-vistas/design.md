# Design: Frontend TAS FB2B — 3 Vistas + Login

## Stack Tecnologico

- **Next.js 16.2.6** (App Router, TypeScript)
- **Tailwind CSS 4** (estilos)
- **React-Leaflet + Leaflet** (mapa geoespacial)
- **Lucide React** (iconos)
- **OpenStreetMap** (tiles, sin API key)

## Estructura de Rutas

```
/login              → Login (publico)
/admin              → Administracion de usuarios (ADMIN)
/simulacion         → Configuracion de sesion (ANALISTA)
/simulacion/[id]    → Simulacion en curso con mapa (ANALISTA)
/operacion          → Operacion dia a dia con mapa (OPERADOR)
```

## Flujo de Autenticacion

```
app/page.tsx
  ├─ Sin token → redirect /login
  └─ Con token → redirect segun rol:
                   ADMINISTRADOR → /admin
                   OPERADOR_LOGISTICO → /operacion
                   ANALISTA → /simulacion
```

## Navegacion (Navbar)

- Logo TAS FB2B a la izquierda
- Nombre del usuario + rol al centro-derecha
- Boton logout (con icono) a la derecha
- Color navbar: azul corporativo (slate-800)
- Links activos con borde inferior

## Componente GeoMapa (Compartido)

El mapa se usa tanto en `/simulacion/[id]` como en `/operacion`.

### Props
```typescript
interface GeoMapaProps {
  nodos: NodoEnMapa[];
  vuelos: VueloEnMapa[];
  colorNodo?: (ocupacion: number, capacidad: number) => string;
  mostrarAviones?: boolean;
  animacionActiva?: boolean;
}
```

### Visualizacion
- **Nodos:** Circulo de 12px con color segun ocupacion + label IATA
  - Verde: ocupacion < 70%
  - Amarillo: 70-90%
  - Rojo: > 90%
- **Vuelos:** Linea polyline entre origen y destino + icono avion animado
  - Posicion del avion interpolada segun hora actual vs hora_salida/llegada
- **Centro:** America del Sur (lat -15, lon -60, zoom 4)

## Admin — Tabla de Usuarios

### Columnas
| Nombre | Correo | Rol | Estado | Acciones |

### Acciones
- Crear usuario → Modal con campos: nombre, correo, password, rol
- Editar usuario → Modal con campo: nombre (solo editable)
- Inactivar/Activar → Modal de confirmacion

### Paginacion
- 10 usuarios por pagina
- Controles prev/next + numero de pagina

## Simulacion

### `/simulacion` (Configuracion)
Formulario con campos:
- Fecha inicio virtual (date)
- Hora inicio virtual (time)
- Probabilidad de cancelacion (slider 0-100%)
- Umbrales almacen: verde_max, ambar_max
- Umbrales vuelo: verde_max, ambar_max

Boton "Iniciar Simulacion" → genera ID mock → redirect a `/simulacion/[id]`

### `/simulacion/[id]` (Ejecucion)
Layout: mapa (70%) + panel lateral (30%)

**Panel lateral:**
- Dia/hora virtual actual
- Tiempo real transcurrido
- SLA acumulado %
- Vuelos cancelados
- Maletas replanificadas
- Botones: Iniciar | Pausar | Detener

**Mapa:** usa GeoMapa con animacion de vuelos (mock, sin backend)

## Operacion

### `/operacion`
Layout: mapa (70%) + panel lateral (30%)

**Panel lateral:**
- Tarjeta: "Equipajes Recientes" (ultimos 10)
- Lista simple: id_externo, destino, estado, tiempo
- Polling cada 5s a GET /nodos, GET /vuelos

**Mapa:** usa GeoMapa sin animacion de aviones, muestra posicion actual de equipajes

## Preparacion para Redis (Futuro)

El hook de polling en operacion se estructura para permitir cambiar de API REST a Redis:
```typescript
// lib/dataSource.ts
export type DataSource = 'api' | 'redis';

// Polling factory que usa DataSource para elegir origen
export function createDataPoller(source: DataSource, endpoint: string) { ... }
```