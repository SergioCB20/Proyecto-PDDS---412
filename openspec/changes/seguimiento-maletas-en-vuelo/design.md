## Context

El panel "Envíos de Maletas" se renderiza dentro de `PanelTabs` en las 3 vistas del sistema. Actualmente solo tiene filtros por origen/destino y muestra datos agrupados. Se necesita:

1. Un filtro por código de maleta (`id_externo`) con búsqueda parcial
2. Botones "Seguir en mapa" y "Mostrar ruta" por fila en la lengüeta "En Vuelo"

El patrón de seguimiento/ruta ya existe y está implementado en `PanelEnviosOperacion` y `PanelEnvios`, con handlers en `page.tsx` para cada vista.

## Goals / Non-Goals

**Goals:**
- Agregar filtro `codigo_equipaje` (LIKE) a los endpoints `GET /api/equipajes/envios-panel` y `GET /api/sesiones/{id}/envios/envios-panel`
- Agregar input de texto en `PanelEnviosMaletas` para el filtro por código de maleta
- Agregar botones MapPin (seguir) y Route (mostrar ruta) por fila en tab "En Vuelo"
- Propagar los callbacks `onSeguirEnMapa` y `onMostrarRuta` desde `page.tsx` → `PanelTabs` → `PanelEnviosMaletas`

**Non-Goals:**
- No se modifican otros tabs (Planificados, Entregados)
- No se modifica el backend para devolver información adicional en la respuesta (el response shape se mantiene igual)
- No se agregan nuevos endpoints

## Decisions

| Decisión | Opción elegida | Alternativas | Razón |
|---|---|---|---|
| Tipo de búsqueda en backend | `LIKE CONCAT('%', :param, '%')` en JPQL | Búsqueda exacta, búsqueda full-text | LIKE parcial permite encontrar maletas tipeando solo parte del código, UX más amigable |
| Dónde agregar el input de filtro | Junto a los selects origen/destino existentes | En una barra separada | Consistencia visual, misma fila de filtros |
| Condición de renderizado de botones | Solo cuando `tab === 'en_vuelo'` y el callback exista | Siempre visible | El seguimiento solo tiene sentido para maletas en vuelo |
| Reutilización de handlers | Los handlers `handleSeguir` y `handleMostrarRuta` son idénticos a los de `PanelEnviosOperacion` | Crear un hook compartido | El código se copia del patrón existente para mantener consistencia; se puede refactorizar a futuro |

## Risks / Trade-offs

- **Riesgo: LIKE sin índices** → La columna `id_externo` no tiene índice. Para cargas de 100 registros (límite del Pageable) el impacto es despreciable.
- **Riesgo: Duplicación de lógica de seguimiento** → Los handlers `handleSeguir`/`handleMostrarRuta` se copian en 3 componentes distintos. Aceptable por ahora, se puede refactorizar a un hook compartido si crece la necesidad.
