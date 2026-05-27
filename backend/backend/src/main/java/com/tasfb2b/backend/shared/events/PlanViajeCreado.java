package com.tasfb2b.backend.shared.events;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PlanViajeCreado(
    UUID equipajeId,
    UUID planViajeId,
    UUID sesionId,
    OffsetDateTime timestamp
) {}
