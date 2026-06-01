package com.tasfb2b.backend.bc2.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "pedidos_base_simulados", indexes = {
    @Index(name = "idx_pedidos_base_fecha", columnList = "fecha_ingreso_virtual")
})
public class PedidoBaseSimulado {

    @Id
    private UUID id;

    @Column(name = "id_externo", nullable = false, length = 50)
    private String idExterno;

    @Column(name = "origen_iata", nullable = false, length = 10)
    private String origenIata;

    @Column(name = "destino_iata", nullable = false, length = 10)
    private String destinoIata;

    @Column(name = "sla_comprometido", nullable = false)
    private OffsetDateTime slaComprometido;

    @Column(name = "fecha_ingreso_virtual", nullable = false)
    private OffsetDateTime fechaIngresoVirtual;

    @Column(name = "cantidad", nullable = false)
    private int cantidad = 1;

    public PedidoBaseSimulado() {
        this.id = UUID.randomUUID();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getIdExterno() { return idExterno; }
    public void setIdExterno(String idExterno) { this.idExterno = idExterno; }
    public String getOrigenIata() { return origenIata; }
    public void setOrigenIata(String origenIata) { this.origenIata = origenIata; }
    public String getDestinoIata() { return destinoIata; }
    public void setDestinoIata(String destinoIata) { this.destinoIata = destinoIata; }
    public OffsetDateTime getSlaComprometido() { return slaComprometido; }
    public void setSlaComprometido(OffsetDateTime slaComprometido) { this.slaComprometido = slaComprometido; }
    public OffsetDateTime getFechaIngresoVirtual() { return fechaIngresoVirtual; }
    public void setFechaIngresoVirtual(OffsetDateTime fechaIngresoVirtual) { this.fechaIngresoVirtual = fechaIngresoVirtual; }
    public int getCantidad() { return cantidad; }
    public void setCantidad(int cantidad) { this.cantidad = cantidad; }
}
