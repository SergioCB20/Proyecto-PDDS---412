package com.tasfb2b.backend.bc2.application;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SegmentoInfo(
        int orden,
        UUID vueloId,
        String vueloCodigo,
        UUID nodoOrigenId,
        String nodoOrigenIata,
        UUID nodoDestinoId,
        String nodoDestinoIata,
        OffsetDateTime horaSalida,
        OffsetDateTime horaLlegada
) {}
