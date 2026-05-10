package com.tasfb2b.backend.bc1.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "plan_vuelos")
public class PlanVuelos {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String descripcion;

    @Column(name = "vigencia_desde", nullable = false)
    private OffsetDateTime vigenciaDesde;

    @Column(name = "vigencia_hasta", nullable = false)
    private OffsetDateTime vigenciaHasta;

    public PlanVuelos() {}

    public PlanVuelos(UUID id, String descripcion, OffsetDateTime vigenciaDesde, OffsetDateTime vigenciaHasta) {
        this.id = id;
        this.descripcion = descripcion;
        this.vigenciaDesde = vigenciaDesde;
        this.vigenciaHasta = vigenciaHasta;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public OffsetDateTime getVigenciaDesde() { return vigenciaDesde; }
    public void setVigenciaDesde(OffsetDateTime vigenciaDesde) { this.vigenciaDesde = vigenciaDesde; }

    public OffsetDateTime getVigenciaHasta() { return vigenciaHasta; }
    public void setVigenciaHasta(OffsetDateTime vigenciaHasta) { this.vigenciaHasta = vigenciaHasta; }
}