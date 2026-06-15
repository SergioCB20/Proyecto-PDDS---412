## Context

El componente `PanelVuelos` ya existe y tiene filtros por código, origen y destino. La telemetría de vuelos (`VueloTelemetria`) no incluye `hora_salida` ni `hora_llegada`, por lo que para ordenar por hora se requiere agregar esos campos desde el backend. El resto de criterios (ocupación, origen, destino) se pueden calcular o usar directamente con los datos existentes.

## Goals / Non-Goals

**Goals:**
- Agregar dropdown de ordenamiento en `PanelVuelos` con 6 opciones
- Incluir `hora_salida` y `hora_llegada` en el payload de telemetría
- Mantener compatibilidad hacia atrás (campos nuevos no rompen consumidores existentes)

**Non-Goals:**
- No modificar la API REST
- No cambiar tipos existentes (solo agregar campos opcionales)
- No afectar el rendimiento del backend (son strings simples agregados al JSON)

## Decisions

### 1. Ordenamiento en el frontend (no en el backend)
La lista de vuelos ya está completa en memoria desde la telemetría. Ordenar en el frontend con `useMemo` evita una llamada adicional al servidor y es instantáneo para el usuario.

### 2. Select único con todas las opciones
En lugar de múltiples controles (uno para campo, otro para dirección), se usa un solo `<Select>` con entradas como "Ocupación ↑" y "Ocupación ↓". Es más simple y la tarea no pide controles separados.

### 3. `hora_salida`/`hora_llegada` como strings ISO
Se envían igual que el resto de fechas en el sistema (ISO 8601). El `localeCompare()` funciona directamente para ordenamiento cronológico.

## Risks / Trade-offs

- **[Backwards compatibility]** Los clientes WebSocket existentes que no usen `hora_salida`/`hora_llegada` no se ven afectados — los nuevos campos se ignoran silenciosamente.
- **[Null safety]** Si `horaSalida` es null en la entidad `Vuelo`, se envía string vacío. El sort pondrá esos al inicio, lo cual es razonable.
