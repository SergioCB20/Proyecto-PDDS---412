package com.tasfb2b.backend.bc2.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "puntos_sla")
public class PuntoSLA {

    @Id
    private UUID id;

    @Column(name = "reporte_id", nullable = false)
    private UUID reporteId;

    @Column(name = "momento_virtual", nullable = false)
    private OffsetDateTime momentoVirtual;

    @Column(name = "sla_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal slaPct;

    @Column(name = "hubo_cancelacion", nullable = false)
    private Boolean huboCancelacion = false;

    @Column(name = "vuelo_cancelado_ref_id")
    private UUID vueloCanceladoRefId;

    public PuntoSLA() {}

    public PuntoSLA(UUID id, UUID reporteId, OffsetDateTime momentoVirtual, BigDecimal slaPct) {
        this.id = id;
        this.reporteId = reporteId;
        this.momentoVirtual = momentoVirtual;
        this.slaPct = slaPct;
        this.huboCancelacion = false;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getReporteId() { return reporteId; }
    public void setReporteId(UUID reporteId) { this.reporteId = reporteId; }

    public OffsetDateTime getMomentoVirtual() { return momentoVirtual; }
    public void setMomentoVirtual(OffsetDateTime momentoVirtual) { this.momentoVirtual = momentoVirtual; }

    public BigDecimal getSlaPct() { return slaPct; }
    public void setSlaPct(BigDecimal slaPct) { this.slaPct = slaPct; }

    public Boolean getHuboCancelacion() { return huboCancelacion; }
    public void setHuboCancelacion(Boolean huboCancelacion) { this.huboCancelacion = huboCancelacion; }

    public UUID getVueloCanceladoRefId() { return vueloCanceladoRefId; }
    public void setVueloCanceladoRefId(UUID vueloCanceladoRefId) { this.vueloCanceladoRefId = vueloCanceladoRefId; }
}
