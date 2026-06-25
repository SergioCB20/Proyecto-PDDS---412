package com.tasfb2b.backend.bc3.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false, unique = true)
    private String correo;

    @Column(nullable = false, length = 50)
    private String estado = "ACTIVO";

    @Column(name = "nodo_ref_id")
    private UUID nodoRefId;

    public Usuario() {}

    public Usuario(UUID id, String nombre, String correo) {
        this.id = id;
        this.nombre = nombre;
        this.correo = correo;
        this.estado = "ACTIVO";
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public UUID getNodoRefId() { return nodoRefId; }
    public void setNodoRefId(UUID nodoRefId) { this.nodoRefId = nodoRefId; }
}
