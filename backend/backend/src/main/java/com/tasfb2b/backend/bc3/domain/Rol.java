package com.tasfb2b.backend.bc3.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "roles")
public class Rol {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String nombre;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String permisos;

    public Rol() {}

    public Rol(UUID id, String nombre, String permisos) {
        this.id = id;
        this.nombre = nombre;
        this.permisos = permisos;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getPermisos() { return permisos; }
    public void setPermisos(String permisos) { this.permisos = permisos; }
}