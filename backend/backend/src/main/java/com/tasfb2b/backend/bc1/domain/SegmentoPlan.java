package com.tasfb2b.backend.bc1.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "segmentos_plan")
public class SegmentoPlan {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_viaje_id", nullable = false)
    private PlanViaje planViaje;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vuelo_id", nullable = false)
    private Vuelo vuelo;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "nodo_origen_id", nullable = false)
    private NodoLogistico nodoOrigen;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "nodo_destino_id", nullable = false)
    private NodoLogistico nodoDestino;

    @Column(nullable = false)
    private Integer orden;

    @Column(name = "hora_salida_prog", nullable = false)
    private OffsetDateTime horaSalidaProg;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private EstadoSegmento estado = EstadoSegmento.PENDIENTE;

    public SegmentoPlan() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public PlanViaje getPlanViaje() { return planViaje; }
    public void setPlanViaje(PlanViaje planViaje) { this.planViaje = planViaje; }

    public Vuelo getVuelo() { return vuelo; }
    public void setVuelo(Vuelo vuelo) { this.vuelo = vuelo; }

    public NodoLogistico getNodoOrigen() { return nodoOrigen; }
    public void setNodoOrigen(NodoLogistico nodoOrigen) { this.nodoOrigen = nodoOrigen; }

    public NodoLogistico getNodoDestino() { return nodoDestino; }
    public void setNodoDestino(NodoLogistico nodoDestino) { this.nodoDestino = nodoDestino; }

    public Integer getOrden() { return orden; }
    public void setOrden(Integer orden) { this.orden = orden; }

    public OffsetDateTime getHoraSalidaProg() { return horaSalidaProg; }
    public void setHoraSalidaProg(OffsetDateTime horaSalidaProg) { this.horaSalidaProg = horaSalidaProg; }

    public EstadoSegmento getEstado() { return estado; }
    public void setEstado(EstadoSegmento estado) { this.estado = estado; }
}