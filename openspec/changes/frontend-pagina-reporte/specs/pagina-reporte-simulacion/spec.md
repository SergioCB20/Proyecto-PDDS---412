# Página de Reporte de Simulación

## ADDED Requirements

### Requirement: Página muestra tarjetas de resumen

La página SHALL mostrar 4 tarjetas con las métricas resumen del reporte:

- **SLA incumplido %**: Porcentaje de equipajes que no cumplieron el SLA comprometido
- **Total maletas replanificadas**: Número total de equipajes que fueron replanificados durante la simulación
- **Punto de colapso**: Momento virtual en el que ocurrió el colapso (si hubo), o "Sin colapso" en caso contrario
- **Causa de colapso**: Descripción textual de la causa del colapso (si hubo), o "—" en caso contrario

#### Scenario: Tarjetas visibles con datos mock
- **WHEN** el usuario navega a `/simulacion/[id]/reporte`
- **THEN** la página muestra 4 tarjetas con los valores provenientes de `MOCK_REPORTE_SESION`

#### Scenario: Tarjeta punto de colapso sin colapso
- **WHEN** `punto_colapso_virtual` es `null`
- **THEN** la tarjeta muestra "Sin colapso"

#### Scenario: Tarjeta causa de colapso sin colapso
- **WHEN** `causa_colapso` es `null`
- **THEN** la tarjeta muestra "—"

### Requirement: Gráfico SLA vs Tiempo con Recharts

La página SHALL incluir un gráfico de líneas (`LineChart` de Recharts) que represente la serie `serie_sla`:

- **Eje X**: `momento_virtual` (fecha/hora virtual de cada punto de medición)
- **Eje Y**: `sla_pct` (porcentaje de SLA, rango 0–100%)
- **Línea**: Traza la evolución del SLA a lo largo del tiempo virtual
- **Marcadores rojos**: Puntos donde `hubo_cancelacion = true` se renderizan con un círculo rojo distintivo
- **Tooltip**: Al hacer hover sobre un punto, muestra `momento_virtual`, `sla_pct` y si hubo cancelación

#### Scenario: Gráfico renderiza serie completa
- **WHEN** la página carga con `MOCK_SERIE_SLA` de 20+ puntos
- **THEN** el `LineChart` renderiza todos los puntos conectados por una línea continua

#### Scenario: Marcadores de cancelación en rojo
- **WHEN** un punto tiene `hubo_cancelacion = true`
- **THEN** se muestra un marcador circular rojo en ese punto

#### Scenario: Tooltip al hacer hover
- **WHEN** el usuario hace hover sobre un punto del gráfico
- **THEN** se muestra un tooltip con `momento_virtual`, `sla_pct` y si hubo cancelación

### Requirement: Patrón de fallback con mock data

La página SHALL intentar obtener datos del endpoint `GET /api/sesiones/{id}/reporte` y, si falla, usar datos mock:

- Realizar fetch con `api.get<ReporteSesion>('/sesiones/${id}/reporte')`
- Si la petición falla (`.catch()`), usar `MOCK_REPORTE_SESION` de `lib/mock.ts`
- El mock SHALL ser consistente con el tipo `ReporteSesion` de `lib/types.ts`

#### Scenario: Fallback a mock cuando API no disponible
- **WHEN** el fetch a `GET /api/sesiones/{id}/reporte` falla
- **THEN** el componente usa `MOCK_REPORTE_SESION` sin mostrar error al usuario

#### Scenario: API disponible retorna datos reales
- **WHEN** el fetch a `GET /api/sesiones/{id}/reporte` es exitoso
- **THEN** el componente usa los datos de la respuesta en lugar del mock

### Requirement: Ruta anidada con parámetro dinámico

La página SHALL estar en la ruta `app/simulacion/[id]/reporte/page.tsx` y recibir el `id` de la sesión como parámetro de ruta.

#### Scenario: Parámetro id disponible
- **WHEN** el usuario navega a `/simulacion/abc-123/reporte`
- **THEN** el componente recibe `params.id = "abc-123"`
