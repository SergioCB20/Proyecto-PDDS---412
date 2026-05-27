package com.tasfb2b.backend.shared.events;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ReplanificacionIniciada(
    UUID loteId,
    UUID sesionId,
    int totalEquipajes,
    OffsetDateTime timestamp
) {}
