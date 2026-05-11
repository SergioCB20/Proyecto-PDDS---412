# Design: Shared Events — TAS FB2B

## Estructura

```
backend/backend/src/main/java/com/tasfb2b/backend/shared/
└── events/
    ├── EquipajeIngresadoEvent.java
    ├── VueloCanceladoEvent.java
    └── UbicacionActualizadaEvent.java
```

## Paquete

`com.tasfb2b.backend.shared.events`

## Eventos

### EquipajeIngresadoEvent

```java
public record EquipajeIngresadoEvent(
    UUID equipajeId,
    OffsetDateTime timestamp
) {}
```

### VueloCanceladoEvent

```java
public record VueloCanceladoEvent(
    UUID vueloId,
    OffsetDateTime timestamp,
    String causa
) {}
```

### UbicacionActualizadaEvent

```java
public record UbicacionActualizadaEvent(
    UUID equipajeId,
    double lat,
    double lon,
    OffsetDateTime timestamp
) {}
```

## Dependencias

- Ninguna dependencia externa
- Solo `java.util.UUID` y `java.time.OffsetDateTime`
- No usar anotaciones de Spring ni JPA