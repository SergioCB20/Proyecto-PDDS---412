package com.tasfb2b.backend.shared.events;

import java.time.OffsetDateTime;
import java.util.UUID;

public record EquipajeIngresadoEvent(
    UUID equipajeId,
    OffsetDateTime timestamp
) {}