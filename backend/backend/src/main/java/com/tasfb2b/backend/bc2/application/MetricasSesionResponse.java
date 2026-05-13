package com.tasfb2b.backend.bc2.application;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record MetricasSesionResponse(
    UUID sesion_id,
    String estado,
    OffsetDateTime dia_hora_virtual,
    Integer segundos_reales_transcurridos,
    BigDecimal sla_acumulado_pct,
    Integer vuelos_cancelados,
    Integer maletas_replanificadas
) {}