package com.tasfb2b.backend.bc2.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "eventos_cancelacion")
public class EventoCancelacion {

    @Id
    private UUID id;

    @Column(name = "sesion_id", nullable = false)
    private UUID sesionId;

    @Column(name = "vuelo_ref_id", nullable = false)
    private UUID vueloRefId;

    @Column(nullable = false)
    private String fuente;

    private String causa;

    @Column(name = "ocurrido_en_virtual")
    private OffsetDateTime ocurriendoEnVirtual;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public EventoCancelacion() {}

    public EventoCancelacion(UUID id, UUID sesionId, UUID vueloRefId, String fuente) {
        this.id = id;
        this.sesionId = sesionId;
        this.vueloRefId = vueloRefId;
        this.fuente = fuente;
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getSesionId() { return sesionId; }
    public void setSesionId(UUID sesionId) { this.sesionId = sesionId; }

    public UUID getVueloRefId() { return vueloRefId; }
    public void setVueloRefId(UUID vueloRefId) { this.vueloRefId = vueloRefId; }

    public String getFuente() { return fuente; }
    public void setFuente(String fuente) { this.fuente = fuente; }

    public String getCausa() { return causa; }
    public void setCausa(String causa) { this.causa = causa; }

    public OffsetDateTime getOcurridoEnVirtual() { return ocurriendoEnVirtual; }
    public void setOcurridoEnVirtual(OffsetDateTime ocurriendoEnVirtual) { this.ocurriendoEnVirtual = ocurriendoEnVirtual; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}