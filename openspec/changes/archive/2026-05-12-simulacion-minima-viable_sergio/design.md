# Design: Simulación con Datos Reales

## 1. Migraciones SQL (V11-V16)

### V11__sesiones_ejecucion.sql
```sql
CREATE TABLE sesiones_ejecucion (
    id UUID PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL,
    estado VARCHAR(20) NOT NULL,
    fecha_inicio_virtual DATE NOT NULL,
    hora_inicio_virtual TIME NOT NULL,
    prob_cancelacion DECIMAL(5,4),
    umbral_almacen_verde_min INT,
    umbral_almacen_verde_max INT,
    umbral_almacen_ambar_min INT,
    umbral_almacen_ambar_max INT,
    umbral_vuelo_verde_min INT,
    umbral_vuelo_verde_max INT,
    umbral_vuelo_ambar_min INT,
    umbral_vuelo_ambar_max INT,
    fecha_inicio_real TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### V12__eventos_cancelacion.sql
```sql
CREATE TABLE eventos_cancelacion (
    id UUID PRIMARY KEY,
    sesion_id UUID REFERENCES sesiones_ejecucion(id),
    vuelo_id UUID NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    causa VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### V13__lotes_replanificacion.sql
```sql
CREATE TABLE lotes_replanificacion (
    id UUID PRIMARY KEY,
    sesion_id UUID REFERENCES sesiones_ejecucion(id),
    evento_cancelacion_id UUID REFERENCES eventos_cancelacion(id),
    estado VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### V14__items_lote.sql
```sql
CREATE TABLE items_lote (
    id UUID PRIMARY KEY,
    lote_id UUID REFERENCES lotes_replanificacion(id),
    equipaje_id UUID NOT NULL,
    estado VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### V15__reportes_sesion.sql
```sql
CREATE TABLE reportes_sesion (
    id UUID PRIMARY KEY,
    sesion_id UUID UNIQUE REFERENCES sesiones_ejecucion(id),
    sla_promedio DECIMAL(5,2),
    vuelos_cancelados INT,
    maletas_replanificadas INT,
    punto_colapso TIMESTAMP,
    generated_at TIMESTAMP DEFAULT NOW()
);
```

### V16__puntos_sla.sql
```sql
CREATE TABLE puntos_sla (
    id UUID PRIMARY KEY,
    sesion_id UUID REFERENCES sesiones_ejecucion(id),
    timestamp TIMESTAMP NOT NULL,
    sla_pct DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 2. Entidades Java

### Enums
- `TipoSesion`: SIMULADA, EN_VIVO
- `EstadoSesion`: CONFIGURADA, EN_CURSO, PAUSADA, FINALIZADA, COLAPSADA
- `EstadoLote`: PENDIENTE, PROCESANDO, COMPLETADO, FALLIDO

### Value Objects
- `UmbralCapacidad`: verdeMin, verdeMax, ambarMin, ambarMax, rojoMin, rojoMax

### SesionEjecucion.java
- id: UUID
- tipo: TipoSesion
- estado: EstadoSesion
- fechaInicioVirtual: LocalDate
- horaInicioVirtual: LocalTime
- probCancelacion: BigDecimal
- umbralesAlmacen: UmbralCapacidad
- umbralesVuelo: UmbralCapacidad
- fechaInicioReal: OffsetDateTime

### EventoCancelacion.java
- id: UUID
- sesionId: UUID
- vueloId: UUID
- timestamp: OffsetDateTime
- causa: String

### LoteReplanificacion.java
- id: UUID
- sesionId: UUID
- eventoCancelacionId: UUID
- estado: EstadoLote
- createdAt: OffsetDateTime

## 3. SesionController

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| /sesiones | POST | Crear sesión |
| /sesiones/{id} | GET | Obtener sesión |
| /sesiones/{id}/iniciar | POST | Iniciar sesión |
| /sesiones/{id}/pausar | POST | Pausar sesión |
| /sesiones/{id}/detener | POST | Detener sesión |
| /sesiones/{id}/metricas | GET | Obtener métricas |

Response /metricas (dummy inicial):
```json
{
  "sesion_id": "uuid",
  "estado": "EN_CURSO",
  "dia_hora_virtual": "2025-06-02T14:30:00Z",
  "segundos_reales_transcurridos": 1240,
  "sla_acumulado_pct": 94.3,
  "vuelos_cancelados": 2,
  "maletas_replanificadas": 18
}
```

## 4. Frontend /simulacion/[id]

Cambios en `app/simulacion/[id]/page.tsx`:
- Usar `useSearchParams()` para obtener configuración
- POST a `/sesiones` al hacer click en "Iniciar"
- Polling GET `/sesiones/{id}/metricas` cada 3 segundos
- Botones iniciar/pausar/detener llaman a sus respectivos endpoints