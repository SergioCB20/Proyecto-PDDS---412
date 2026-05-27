package com.tasfb2b.backend.shared.events;

import java.time.OffsetDateTime;
import java.util.UUID;

public record EquipajePlanificadoEvent(
    UUID equipajeId,
    UUID planViajeId,
    String tipo,
    String estado,
    OffsetDateTime timestamp
) {}
