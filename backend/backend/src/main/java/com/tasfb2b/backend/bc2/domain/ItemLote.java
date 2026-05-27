package com.tasfb2b.backend.bc2.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "items_lote")
public class ItemLote {

    @Id
    private UUID id;

    @Column(name = "lote_id", nullable = false)
    private UUID loteId;

    @Column(name = "equipaje_ref_id", nullable = false)
    private UUID equipajeRefId;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_replanificacion", nullable = false)
    private EstadoReplanificacion estadoReplanificacion = EstadoReplanificacion.PENDIENTE;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public ItemLote() {}

    public ItemLote(UUID id, UUID loteId, UUID equipajeRefId) {
        this.id = id;
        this.loteId = loteId;
        this.equipajeRefId = equipajeRefId;
        this.estadoReplanificacion = EstadoReplanificacion.PENDIENTE;
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getLoteId() { return loteId; }
    public void setLoteId(UUID loteId) { this.loteId = loteId; }

    public UUID getEquipajeRefId() { return equipajeRefId; }
    public void setEquipajeRefId(UUID equipajeRefId) { this.equipajeRefId = equipajeRefId; }

    public EstadoReplanificacion getEstadoReplanificacion() { return estadoReplanificacion; }
    public void setEstadoReplanificacion(EstadoReplanificacion estadoReplanificacion) { this.estadoReplanificacion = estadoReplanificacion; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
