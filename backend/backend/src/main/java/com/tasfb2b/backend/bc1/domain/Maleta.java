package com.tasfb2b.backend.bc1.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Maleta física con identificador único, hija 1:N de un Equipaje.
 * El {@code codigoMaleta} es el UUID visible al usuario y se construye
 * siguiendo el patrón "MAL-<id_externo_equipaje>-<NN>" donde NN es el
 * ordinal dentro del equipaje (de 1 hasta Equipaje.cantidad).
 */
@Entity
@Table(name = "maletas")
public class Maleta {

    @Id
    private UUID id;

    @Column(name = "codigo_maleta", nullable = false, unique = true, length = 50)
    private String codigoMaleta;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "equipaje_id", nullable = false)
    private Equipaje equipaje;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public Maleta() {}

    public Maleta(UUID id, String codigoMaleta, Equipaje equipaje, OffsetDateTime createdAt) {
        this.id = id;
        this.codigoMaleta = codigoMaleta;
        this.equipaje = equipaje;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getCodigoMaleta() { return codigoMaleta; }
    public void setCodigoMaleta(String codigoMaleta) { this.codigoMaleta = codigoMaleta; }

    public Equipaje getEquipaje() { return equipaje; }
    public void setEquipaje(Equipaje equipaje) { this.equipaje = equipaje; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
