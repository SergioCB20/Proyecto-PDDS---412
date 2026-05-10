package com.tasfb2b.backend.bc3.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "rol_id", nullable = false)
    private Rol rol;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false, unique = true)
    private String correo;

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private EstadoUsuario estado = EstadoUsuario.ACTIVO;

    @Column(name = "hash_password", nullable = false)
    private String hashPassword;

    @Column(name = "ultimo_acceso")
    private OffsetDateTime ultimoAcceso;

    @Column(name = "intentos_fallidos", nullable = false)
    private int intentosFallidos = 0;

    @Column(name = "nodo_ref_id")
    private UUID nodoRefId;

    @Column(name = "asignado_en")
    private OffsetDateTime asignadoEn;

    public Usuario() {}

    public Usuario(UUID id, Rol rol, String nombre, String correo, String hashPassword) {
        this.id = id;
        this.rol = rol;
        this.nombre = nombre;
        this.correo = correo;
        this.hashPassword = hashPassword;
        this.estado = EstadoUsuario.ACTIVO;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Rol getRol() { return rol; }
    public void setRol(Rol rol) { this.rol = rol; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }

    public EstadoUsuario getEstado() { return estado; }
    public void setEstado(EstadoUsuario estado) { this.estado = estado; }

    public String getHashPassword() { return hashPassword; }
    public void setHashPassword(String hashPassword) { this.hashPassword = hashPassword; }

    public OffsetDateTime getUltimoAcceso() { return ultimoAcceso; }
    public void setUltimoAcceso(OffsetDateTime ultimoAcceso) { this.ultimoAcceso = ultimoAcceso; }

    public int getIntentosFallidos() { return intentosFallidos; }
    public void setIntentosFallidos(int intentosFallidos) { this.intentosFallidos = intentosFallidos; }

    public UUID getNodoRefId() { return nodoRefId; }
    public void setNodoRefId(UUID nodoRefId) { this.nodoRefId = nodoRefId; }

    public OffsetDateTime getAsignadoEn() { return asignadoEn; }
    public void setAsignadoEn(OffsetDateTime asignadoEn) { this.asignadoEn = asignadoEn; }
}