package com.tasfb2b.backend.bc3.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "entradas_auditoria")
public class EntradaAuditoria {

    @Id
    private UUID id;

    @Column(name = "usuario_id", nullable = false)
    private UUID usuarioId;

    @Column(nullable = false)
    private String accion;

    @Column(name = "entidad_afectada", nullable = false)
    private String entidadAfectada;

    @Column(name = "ocurrido_en", nullable = false)
    private OffsetDateTime ocurridoEn;

    public EntradaAuditoria() {}

    public EntradaAuditoria(UUID id, UUID usuarioId, String accion, String entidadAfectada) {
        this.id = id;
        this.usuarioId = usuarioId;
        this.accion = accion;
        this.entidadAfectada = entidadAfectada;
        this.ocurridoEn = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUsuarioId() { return usuarioId; }
    public void setUsuarioId(UUID usuarioId) { this.usuarioId = usuarioId; }

    public String getAccion() { return accion; }
    public void setAccion(String accion) { this.accion = accion; }

    public String getEntidadAfectada() { return entidadAfectada; }
    public void setEntidadAfectada(String entidadAfectada) { this.entidadAfectada = entidadAfectada; }

    public OffsetDateTime getOcurridoEn() { return ocurridoEn; }
    public void setOcurridoEn(OffsetDateTime ocurridoEn) { this.ocurridoEn = ocurridoEn; }
}