package com.tasfb2b.backend.bc2.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "lotes_replanificacion")
public class LoteReplanificacion {

    @Id
    private UUID id;

    @Column(name = "evento_id", nullable = false)
    private UUID eventoId;

    @Column(name = "sesion_id", nullable = false)
    private UUID sesionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoLote estado = EstadoLote.PENDIENTE;

    @Column(name = "total_equipajes")
    private Integer totalEquipajes = 0;

    @Column(name = "creado_en", nullable = false)
    private OffsetDateTime creadoEn;

    public LoteReplanificacion() {}

    public LoteReplanificacion(UUID id, UUID eventoId, UUID sesionId) {
        this.id = id;
        this.eventoId = eventoId;
        this.sesionId = sesionId;
        this.creadoEn = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getEventoId() { return eventoId; }
    public void setEventoId(UUID eventoId) { this.eventoId = eventoId; }

    public UUID getSesionId() { return sesionId; }
    public void setSesionId(UUID sesionId) { this.sesionId = sesionId; }

    public EstadoLote getEstado() { return estado; }
    public void setEstado(EstadoLote estado) { this.estado = estado; }

    public Integer getTotalEquipajes() { return totalEquipajes; }
    public void setTotalEquipajes(Integer totalEquipajes) { this.totalEquipajes = totalEquipajes; }

    public OffsetDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(OffsetDateTime creadoEn) { this.creadoEn = creadoEn; }
}