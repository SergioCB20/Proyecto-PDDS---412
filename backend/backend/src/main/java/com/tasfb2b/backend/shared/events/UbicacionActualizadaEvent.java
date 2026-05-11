package com.tasfb2b.backend.shared.events;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UbicacionActualizadaEvent(
    UUID equipajeId,
    double lat,
    double lon,
    OffsetDateTime timestamp
) {}