## Context

Los paneles de envíos (`PanelEnviosOperacion` en operación y `PanelEnvios` en simulación/colapso) muestran una lista de `EnvioItemResponse[]` con código de equipaje, ruta origen→destino, cantidad de maletas y un botón para descargar el plan de viaje PDF. El mapa Leaflet (`GeoMapa`) ya soporta seguimiento de vuelos mediante la prop `seguidoVueloId`: cuando se asigna un ID de vuelo, `MapController` vuela la cámara y `AvionAnimado` mantiene el avión centrado con resalte dorado.

Actualmente no hay forma de ir desde un envío en la lista al vuelo que lo transporta en el mapa. El backend ya expone `GET /api/equipajes/{id}/plan-viaje` que retorna JSON con `ubicacion_actual` (tipo `VUELO`/`NODO` + `referencia_id`), permitiendo saber en qué vuelo está una maleta sin necesidad de un endpoint nuevo.

## Goals / Non-Goals

**Goals:**
- Agregar un botón "Seguir en mapa" por fila de envío en ambos paneles (`PanelEnviosOperacion` y `PanelEnvios`).
- Al pulsar, consultar `GET /equipajes/{id}/plan-viaje`, extraer el `vuelo_id` desde `ubicacion_actual`, y activar el seguimiento en el mapa.
- Manejar el caso donde la maleta no está en un vuelo (ubicación en nodo).
- Soporte en los tres contextos: OperacionView, SimulacionView, ColapsoView.

**Non-Goals:**
- No se crean nuevos endpoints backend.
- No se modifica la lógica del mapa (`GeoMapa`, `AvionAnimado`, `MapController`).
- No se agrega polling ni actualización automática — solo acción bajo demanda del usuario.
- No se modifica el comportamiento del botón PDF existente.

## Decisions

1. **Usar `GET /equipajes/{id}/plan-viaje` en lugar de crear un endpoint nuevo** — El endpoint ya existe, retorna toda la información necesaria (`ubicacion_actual.tipo` + `referencia_id`), y no requiere autenticación extra. Alternativa considerada: crear `GET /equipajes/{id}/vuelo-actual` (más lightweight) pero implicaba cambio backend innecesario.

2. **Prop opcional `onSeguirEnMapa`** — Se define como opcional (`onSeguirEnMapa?: (vueloId: string) => void`) para no romper ninguna llamada existente. Si no se provee, el botón no se renderiza o es inactivo. Alternativa considerada: prop requerida (más estricta, pero forzaría cambios en todas las llamadas actuales).

3. **Fetch individual al click** — La consulta al plan de viaje se hace solo cuando el usuario pulsa el botón, no al cargar la lista. Esto evita N requests innecesarios al abrir el panel (podría haber decenas de envíos). Alternativa considerada: precargar al montar el panel (evita latencia en el click pero desperdicia requests).

4. **Estado de carga por-item** — Se mantiene un `siguiendoId: string | null` que identifica qué ítem está en proceso de consulta, mostrando un spinner giratorio solo en ese botón. Alternativa considerada: estado global de carga (bloquea toda la UI innecesariamente).

5. **Mismo icono `MapPin` de lucide-react** — Ya se usa `lucide-react` en el proyecto. `MapPin` comunica visualmente "mostrar en el mapa". Alternativa considerada: `Navigation` o `Crosshair` (menos intuitivos).

## Risks / Trade-offs

- **Latencia en el click** → Cada click hace un request HTTP. En redes lentas puede haber demora de 1-2s. Mitigación: spinner local en el botón para feedback inmediato.
- **Maleta no encontrada** → Si el equipaje fue eliminado o el ID no existe, el endpoint devuelve 404. Mitigación: catch con alert genérico "Error al obtener información de la maleta".
- **Maleta en nodo (no en vuelo)** → No hay vuelo que seguir. Mitigación: alert claro "La maleta no está en un vuelo actualmente".
- **Dos paneles con lógica duplicada** → `PanelEnviosOperacion` y `PanelEnvios` comparten ~90% del código. Se podría refactorizar a un componente compartido, pero está fuera del alcance de este cambio. Se aplica la misma modificación en ambos archivos.
