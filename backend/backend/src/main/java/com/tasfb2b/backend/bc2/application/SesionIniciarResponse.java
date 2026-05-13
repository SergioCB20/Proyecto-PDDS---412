package com.tasfb2b.backend.bc2.application;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SesionIniciarResponse(
    UUID id,
    String estado,
    OffsetDateTime fecha_inicio_real
) {}