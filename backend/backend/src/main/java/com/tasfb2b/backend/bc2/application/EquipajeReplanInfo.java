package com.tasfb2b.backend.bc2.application;

import java.util.List;
import java.util.UUID;

public record EquipajeReplanInfo(
    UUID id,
    String codigo,
    UUID vueloId,
    String vueloCodigo,
    List<SegmentoReplanInfo> segmentos
) {}
