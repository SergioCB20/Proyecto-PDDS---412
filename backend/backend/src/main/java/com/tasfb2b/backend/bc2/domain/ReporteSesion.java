package com.tasfb2b.backend.bc2.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "reportes_sesion")
public class ReporteSesion {

    @Id
    private UUID id;

    @Column(name = "sesion_id", nullable = false, unique = true)
    private UUID sesionId;

    @Column(name = "sla_incumplido_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal slaIncumplidoPct;

    @Column(name = "total_replanificadas", nullable = false)
    private Integer totalReplanificadas;

    @Column(name = "punto_colapso_virtual")
    private OffsetDateTime puntoColapsoVirtual;

    @Column(name = "nodo_colapso_ref_id")
    private UUID nodoColapsoRefId;

    @Column(name = "causa_colapso")
    private String causaColapso;

    @Column(name = "generado_en", nullable = false)
    private OffsetDateTime generadoEn;

    public ReporteSesion() {}

    public ReporteSesion(UUID id, UUID sesionId) {
        this.id = id;
        this.sesionId = sesionId;
        this.generadoEn = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getSesionId() { return sesionId; }
    public void setSesionId(UUID sesionId) { this.sesionId = sesionId; }

    public BigDecimal getSlaIncumplidoPct() { return slaIncumplidoPct; }
    public void setSlaIncumplidoPct(BigDecimal slaIncumplidoPct) { this.slaIncumplidoPct = slaIncumplidoPct; }

    public Integer getTotalReplanificadas() { return totalReplanificadas; }
    public void setTotalReplanificadas(Integer totalReplanificadas) { this.totalReplanificadas = totalReplanificadas; }

    public OffsetDateTime getPuntoColapsoVirtual() { return puntoColapsoVirtual; }
    public void setPuntoColapsoVirtual(OffsetDateTime puntoColapsoVirtual) { this.puntoColapsoVirtual = puntoColapsoVirtual; }

    public UUID getNodoColapsoRefId() { return nodoColapsoRefId; }
    public void setNodoColapsoRefId(UUID nodoColapsoRefId) { this.nodoColapsoRefId = nodoColapsoRefId; }

    public String getCausaColapso() { return causaColapso; }
    public void setCausaColapso(String causaColapso) { this.causaColapso = causaColapso; }

    public OffsetDateTime getGeneradoEn() { return generadoEn; }
    public void setGeneradoEn(OffsetDateTime generadoEn) { this.generadoEn = generadoEn; }
}
