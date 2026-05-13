package com.tasfb2b.backend.bc2.application;

import java.util.UUID;

public record SesionResponse(
    UUID id,
    String tipo,
    String estado
) {}