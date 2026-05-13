## Context

El backend BC1 (~85% completo) necesita las últimas funcionalidades operativas para permitir al equipo de frontend completar las tareas relacionadas y para métricas en tiempo real con Redis.

## Goals / Non-Goals

**Goals:**
- Carga masiva CSV funcional con preview de validación
- Confirmar carga masiva con batch insert
- Manifiesto PDF descargable por vuelo
- Redis actualizado al registrar/cancelar equipajes

**Non-Goals:**
- No crear sesión de simulación (es BC2)
- No implementar WebSocket de telemetría (es BC2)
- No modificar el algoritmo de enrutamiento (es BC2)

## Decisions

### 1. Carga Masiva - Preview en memoria
El preview se guarda en un `ConcurrentHashMap<UUID, List<RegistroPreview>>` dentro del service, keyeado por `operadorNodoId`.
- **Alternativa**: Tabla temporal en BD — rechazado por complejidad
- **Razón**: Simplicidad, las sesiones de operador son cortas

### 2. CSV Parser
Parser manual con soporte básico de comillas (detecta `","` fuera de comillas).
- **Alternativa**: Usar Apache Commons CSV — rechazado por no agregar dependencia
- **Razón**: Soporte suficiente para el formato esperado

### 3. PDF Library
OpenPDF 2.0.3 ( LGPL ) en lugar de iText (AGPL).
- **Alternativa**: iText 7 — rechazado por licenciamiento más restrictivo
- **Razón**: OpenPDF es fork activo con licencia más permisiva

### 4. Redis Keys
Formato: `nodo:{id}:ocupacion`, `vuelo:{id}:carga_disponible`
- **Alternativa**: Hash con prefijo `bc1:` — rechazado por simplicidad del spec
- **Razón**:keys simples alineadas con database-schema.md

### 5. Errores en Controller
Manejo try-catch manual en Controllers (patrón existente).
- **Alternativa**: Delegar a GlobalExceptionHandler — no implementado por inconsistencia con resto del código
- **Razón**: Mantener consistencia con código existente

## Risks / Trade-offs

- [Riesgo] Preview en memoria se pierde si se reinicia el server — Aceptable: sesiones cortas, operador debe confirmar rápido
- [Riesgo] Redis no disponible — Aceptable: la app funciona sin Redis, es solo cache
- [Trade-off] Batch insert no es transaccional por fila — Aceptable: si una falla, sigue con las demás y cuenta fallidos
- [Trade-off] Manifiesto PDF sin paginación si muchos equipajes — Aceptable: volumen esperado bajo