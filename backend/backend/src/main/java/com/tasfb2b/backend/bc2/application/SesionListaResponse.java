package com.tasfb2b.backend.bc2.application;

import java.util.UUID;

public record SesionListaResponse(
    UUID id,
    String tipo,
    String tipo_simulacion,
    String estado,
    String fecha_inicio_virtual,
    String hora_inicio_virtual,
    String created_at,
    String dispositivo_id
) {}
