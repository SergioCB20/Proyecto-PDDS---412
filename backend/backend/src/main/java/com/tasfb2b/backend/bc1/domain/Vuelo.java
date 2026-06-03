package com.tasfb2b.backend.bc1.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "vuelos")
public class Vuelo {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_vuelos_id", nullable = false)
    private PlanVuelos planVuelos;

    @Column(name = "codigo_vuelo", nullable = false, length = 20)
    private String codigoVuelo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private EstadoVuelo estado = EstadoVuelo.PROGRAMADO;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "origen_id", nullable = false)
    private NodoLogistico origen;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "destino_id", nullable = false)
    private NodoLogistico destino;

    @Column(name = "origen_lat", nullable = false, precision = 9, scale = 6)
    private BigDecimal origenLat;

    @Column(name = "origen_lon", nullable = false, precision = 9, scale = 6)
    private BigDecimal origenLon;

    @Column(name = "destino_lat", nullable = false, precision = 9, scale = 6)
    private BigDecimal destinoLat;

    @Column(name = "destino_lon", nullable = false, precision = 9, scale = 6)
    private BigDecimal destinoLon;

    @Column(name = "capacidad_carga", nullable = false)
    private Integer capacidadCarga;

    @Column(name = "carga_disponible", nullable = false)
    private Integer cargaDisponible;

    @Column(name = "hora_salida", nullable = false)
    private OffsetDateTime horaSalida;

    @Column(name = "hora_llegada", nullable = false)
    private OffsetDateTime horaLlegada;

    @Column(name = "es_plantilla", nullable = false)
    private Boolean esPlantilla = false;

    @Column(name = "fecha_operacion")
    private LocalDate fechaOperacion;

    public Vuelo() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public PlanVuelos getPlanVuelos() { return planVuelos; }
    public void setPlanVuelos(PlanVuelos planVuelos) { this.planVuelos = planVuelos; }

    public String getCodigoVuelo() { return codigoVuelo; }
    public void setCodigoVuelo(String codigoVuelo) { this.codigoVuelo = codigoVuelo; }

    public EstadoVuelo getEstado() { return estado; }
    public void setEstado(EstadoVuelo estado) { this.estado = estado; }

    public NodoLogistico getOrigen() { return origen; }
    public void setOrigen(NodoLogistico origen) { this.origen = origen; }

    public NodoLogistico getDestino() { return destino; }
    public void setDestino(NodoLogistico destino) { this.destino = destino; }

    public BigDecimal getOrigenLat() { return origenLat; }
    public void setOrigenLat(BigDecimal origenLat) { this.origenLat = origenLat; }

    public BigDecimal getOrigenLon() { return origenLon; }
    public void setOrigenLon(BigDecimal origenLon) { this.origenLon = origenLon; }

    public BigDecimal getDestinoLat() { return destinoLat; }
    public void setDestinoLat(BigDecimal destinoLat) { this.destinoLat = destinoLat; }

    public BigDecimal getDestinoLon() { return destinoLon; }
    public void setDestinoLon(BigDecimal destinoLon) { this.destinoLon = destinoLon; }

    public Integer getCapacidadCarga() { return capacidadCarga; }
    public void setCapacidadCarga(Integer capacidadCarga) { this.capacidadCarga = capacidadCarga; }

    public Integer getCargaDisponible() { return cargaDisponible; }
    public void setCargaDisponible(Integer cargaDisponible) { this.cargaDisponible = cargaDisponible; }

    public OffsetDateTime getHoraSalida() { return horaSalida; }
    public void setHoraSalida(OffsetDateTime horaSalida) { this.horaSalida = horaSalida; }

    public OffsetDateTime getHoraLlegada() { return horaLlegada; }
    public void setHoraLlegada(OffsetDateTime horaLlegada) { this.horaLlegada = horaLlegada; }

    public Boolean getEsPlantilla() { return esPlantilla; }
    public void setEsPlantilla(Boolean esPlantilla) { this.esPlantilla = esPlantilla; }

    public LocalDate getFechaOperacion() { return fechaOperacion; }
    public void setFechaOperacion(LocalDate fechaOperacion) { this.fechaOperacion = fechaOperacion; }

    public double getOcupacionPorcentaje() {
        if (capacidadCarga == null || capacidadCarga == 0) return 0;
        return ((capacidadCarga - cargaDisponible) * 100.0) / capacidadCarga;
    }
}