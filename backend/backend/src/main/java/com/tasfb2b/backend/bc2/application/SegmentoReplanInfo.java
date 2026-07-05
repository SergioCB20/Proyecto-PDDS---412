package com.tasfb2b.backend.bc2.application;

import java.util.UUID;

public record SegmentoReplanInfo(
    int orden,
    UUID vueloId,
    String vueloCodigo,
    String nodoOrigenIata,
    String nodoDestinoIata,
    String horaSalidaProg
) {}
