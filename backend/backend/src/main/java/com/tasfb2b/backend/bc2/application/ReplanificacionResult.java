package com.tasfb2b.backend.bc2.application;

import java.util.List;
import java.util.UUID;

public record ReplanificacionResult(
    int afectados,
    UUID loteId,
    List<UUID> equipajeIds,
    List<EquipajeReplanInfo> equipajes
) {
    public ReplanificacionResult(int afectados, UUID loteId, List<UUID> equipajeIds) {
        this(afectados, loteId, equipajeIds, List.of());
    }
}
