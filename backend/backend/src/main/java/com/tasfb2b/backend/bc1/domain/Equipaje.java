package com.tasfb2b.backend.bc1.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "equipajes")
public class Equipaje {

    @Id
    private UUID id;

    @OneToOne(mappedBy = "equipaje", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private PlanViaje planViaje;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vuelo_actual_id")
    private Vuelo vueloActual;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private EstadoEquipaje estado = EstadoEquipaje.REGISTRADO;

    @Column(name = "id_externo", length = 100)
    private String idExterno;

    @Column(name = "fecha_ingreso", nullable = false)
    private OffsetDateTime fechaIngreso;

    @Column(name = "destino_iata", nullable = false, length = 10)
    private String destinoIata;

    @Column(name = "origen_iata", nullable = false, length = 10)
    private String origenIata;

    @Column(nullable = false)
    private Integer cantidad = 1;

    @Column(name = "fecha_operacion")
    private OffsetDateTime fechaOperacion;

    @Column(name = "sla_comprometido", nullable = false)
    private OffsetDateTime slaComprometido;

    public Equipaje() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public PlanViaje getPlanViaje() { return planViaje; }
    public void setPlanViaje(PlanViaje planViaje) { this.planViaje = planViaje; }

    public Vuelo getVueloActual() { return vueloActual; }
    public void setVueloActual(Vuelo vueloActual) { this.vueloActual = vueloActual; }

    public EstadoEquipaje getEstado() { return estado; }
    public void setEstado(EstadoEquipaje estado) { this.estado = estado; }

    public String getIdExterno() { return idExterno; }
    public void setIdExterno(String idExterno) { this.idExterno = idExterno; }

    public OffsetDateTime getFechaIngreso() { return fechaIngreso; }
    public void setFechaIngreso(OffsetDateTime fechaIngreso) { this.fechaIngreso = fechaIngreso; }

    public String getDestinoIata() { return destinoIata; }
    public void setDestinoIata(String destinoIata) { this.destinoIata = destinoIata; }

    public String getOrigenIata() { return origenIata; }
    public void setOrigenIata(String origenIata) { this.origenIata = origenIata; }

    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }

    public OffsetDateTime getFechaOperacion() { return fechaOperacion; }
    public void setFechaOperacion(OffsetDateTime fechaOperacion) { this.fechaOperacion = fechaOperacion; }

    public OffsetDateTime getSlaComprometido() { return slaComprometido; }
    public void setSlaComprometido(OffsetDateTime slaComprometido) { this.slaComprometido = slaComprometido; }
}