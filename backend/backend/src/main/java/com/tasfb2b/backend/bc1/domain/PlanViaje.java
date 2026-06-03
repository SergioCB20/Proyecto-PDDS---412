package com.tasfb2b.backend.bc1.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "planes_viaje")
public class PlanViaje {

    @Id
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipaje_id", nullable = false)
    private Equipaje equipaje;

    @Column(name = "estado_sla", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private EstadoSla estadoSla = EstadoSla.EN_TIEMPO;

    @Column(name = "tiempo_entrega_est")
    private OffsetDateTime tiempoEntregaEst;

    @Column(name = "ubicacion_tipo", length = 20)
    @Enumerated(EnumType.STRING)
    private UbicacionTipo ubicacionTipo;

    @Column(name = "ubicacion_id")
    private UUID ubicacionId;

    @Column(name = "ubicacion_lat", precision = 9, scale = 6)
    private BigDecimal ubicacionLat;

    @Column(name = "ubicacion_lon", precision = 9, scale = 6)
    private BigDecimal ubicacionLon;

    @Column(name = "sesion_id")
    private UUID sesionId;

    @OneToMany(mappedBy = "planViaje", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("orden ASC")
    private List<SegmentoPlan> segmentos = new ArrayList<>();

    public PlanViaje() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Equipaje getEquipaje() { return equipaje; }
    public void setEquipaje(Equipaje equipaje) { this.equipaje = equipaje; }

    public EstadoSla getEstadoSla() { return estadoSla; }
    public void setEstadoSla(EstadoSla estadoSla) { this.estadoSla = estadoSla; }

    public OffsetDateTime getTiempoEntregaEst() { return tiempoEntregaEst; }
    public void setTiempoEntregaEst(OffsetDateTime tiempoEntregaEst) { this.tiempoEntregaEst = tiempoEntregaEst; }

    public UbicacionTipo getUbicacionTipo() { return ubicacionTipo; }
    public void setUbicacionTipo(UbicacionTipo ubicacionTipo) { this.ubicacionTipo = ubicacionTipo; }

    public UUID getUbicacionId() { return ubicacionId; }
    public void setUbicacionId(UUID ubicacionId) { this.ubicacionId = ubicacionId; }

    public BigDecimal getUbicacionLat() { return ubicacionLat; }
    public void setUbicacionLat(BigDecimal ubicacionLat) { this.ubicacionLat = ubicacionLat; }

    public BigDecimal getUbicacionLon() { return ubicacionLon; }
    public void setUbicacionLon(BigDecimal ubicacionLon) { this.ubicacionLon = ubicacionLon; }

    public List<SegmentoPlan> getSegmentos() { return segmentos; }
    public void setSegmentos(List<SegmentoPlan> segmentos) { this.segmentos = segmentos; }

    public UUID getSesionId() { return sesionId; }
    public void setSesionId(UUID sesionId) { this.sesionId = sesionId; }
}