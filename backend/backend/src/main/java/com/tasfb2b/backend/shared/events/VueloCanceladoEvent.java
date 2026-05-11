package com.tasfb2b.backend.shared.events;

import java.time.OffsetDateTime;
import java.util.UUID;

public record VueloCanceladoEvent(
    UUID vueloId,
    OffsetDateTime timestamp,
    String causa
) {}