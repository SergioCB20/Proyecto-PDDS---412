## Context

El sistema de gestión logística maneja equipaje entre aeropuertos en tres continentes: América del Sur, Europa y Asia. El SLA (Service Level Agreement) es un indicador clave: define la fecha/hora límite para que un equipaje sea entregado en su destino.

Previamente, el operador ingresaba manualmente el SLA en horas, lo que:
1. Violaba la regla de negocio (el SLA no depende del criterio humano)
2. Podía llevar a errores de ingreso (valores inconsistentes)
3. No escalaba para carga masiva (el CSV debía incluir fechas ISO 8601 difíciles de generar manualmente)

La solución clasifica los aeropuertos por continente y calcula el SLA automáticamente con la regla: 24h mismo continente, 48h distinto continente.

## Goals / Non-Goals

**Goals:**
- Eliminar la entrada manual de SLA en registro individual y carga masiva
- Implementar el cálculo automático basado en continentes
- Clasificar los 30 aeropuertos existentes
- Actualizar frontend y backend de forma consistente

**Non-Goals:**
- No se modifica el motor de enrutamiento ni replanificación
- No se agregan nuevos endpoints
- No se modifican los valores de SLA históricos en la BD (solo aplica a nuevos registros)

## Decisions

| Decisión | Opción elegida | Alternativa descartada |
|---|---|---|
| **Clasificación de continentes** | Enum `Continente` + mapa estático por código IATA | Determinar continente por coordenadas (más complejo, propenso a errores en límites geográficos) |
| **Persistencia de continente** | Columna `continente` en `nodos_logisticos` | Cálculo en tiempo real (evita joins, permite consultas directas) |
| **Actualización de nodos existentes** | `poblarContinentes()` en el seeder existente | Nueva migración Flyway (Flyway no funciona con SB4) |
| **Columna nullable** | `continente` sin `NOT NULL` (nullable) | `NOT NULL` (fallaría al agregar columna con datos existentes) |
| **Cálculo de SLA en actualizar** | Usa `vuelo.origen` como referencia de origen | Usar el operador autenticado (el endpoint PUT no tiene contexto de operador) |

## Risks / Trade-offs

- **[Riesgo bajo] Continente nulo**: Si algún nodo nuevo no tiene continente asignado, el cálculo de SLA usaría `null == null` → 24h (podría ser incorrecto). El seeder mitiga esto asignando continente a cualquier nodo sin clasificar.
- **[Riesgo bajo] SLA en actualizar**: El PUT `/equipajes/{id}` recalcula SLA usando `vuelo.origen.getContinente()`. Si el equipaje ya ha cambiado de ubicación, el origen del vuelo podría no ser el origen real del equipaje. Es aceptable porque el PUT es una operación correctiva poco frecuente.
- **[Trade-off] SLA de 24h para rutas intra-ASIA**: Rutas como Delhi→Dubai son intra-Asia (24h), pero rutas como Delhi→Amsterdam son intercontinentales (48h). Esto coincide con la regla de negocio definida.
