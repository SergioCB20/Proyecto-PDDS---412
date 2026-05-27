package com.tasfb2b.backend.bc1.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "cola_planificacion")
public class ColaPlanificacion {

    @Id
    private UUID id;

    @Column(name = "equipaje_id", nullable = false)
    private UUID equipajeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoCola tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoCola estado = EstadoCola.PENDIENTE;

    @Column(nullable = false)
    private Integer intentos = 0;

    @Column(columnDefinition = "TEXT")
    private String error;

    @Column(name = "fecha_creacion", nullable = false)
    private OffsetDateTime fechaCreacion;

    @Column(name = "fecha_procesado")
    private OffsetDateTime fechaProcesado;

    public ColaPlanificacion() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getEquipajeId() { return equipajeId; }
    public void setEquipajeId(UUID equipajeId) { this.equipajeId = equipajeId; }

    public TipoCola getTipo() { return tipo; }
    public void setTipo(TipoCola tipo) { this.tipo = tipo; }

    public EstadoCola getEstado() { return estado; }
    public void setEstado(EstadoCola estado) { this.estado = estado; }

    public Integer getIntentos() { return intentos; }
    public void setIntentos(Integer intentos) { this.intentos = intentos; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public OffsetDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(OffsetDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public OffsetDateTime getFechaProcesado() { return fechaProcesado; }
    public void setFechaProcesado(OffsetDateTime fechaProcesado) { this.fechaProcesado = fechaProcesado; }
}
