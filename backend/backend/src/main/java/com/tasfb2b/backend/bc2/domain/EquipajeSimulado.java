package com.tasfb2b.backend.bc2.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "equipajes_simulados")
public class EquipajeSimulado {

    @Id
    private UUID id;

    @Column(name = "sesion_id", nullable = false)
    private UUID sesionId;

    @Column(name = "id_externo", nullable = false, length = 50)
    private String idExterno;

    @Column(name = "origen_iata", nullable = false, length = 10)
    private String origenIata;

    @Column(name = "destino_iata", nullable = false, length = 10)
    private String destinoIata;

    @Column(name = "vuelo_id")
    private UUID vueloId;

    @Column(name = "sla_comprometido", nullable = false)
    private OffsetDateTime slaComprometido;

    @Column(name = "fecha_ingreso_virtual", nullable = false)
    private OffsetDateTime fechaIngresoVirtual;

    @Column(name = "procesado", nullable = false)
    private boolean procesado = false;

    public EquipajeSimulado() {
        this.id = UUID.randomUUID();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    
    public UUID getSesionId() { return sesionId; }
    public void setSesionId(UUID sesionId) { this.sesionId = sesionId; }
    
    public String getIdExterno() { return idExterno; }
    public void setIdExterno(String idExterno) { this.idExterno = idExterno; }
    
    public String getOrigenIata() { return origenIata; }
    public void setOrigenIata(String origenIata) { this.origenIata = origenIata; }
    
    public String getDestinoIata() { return destinoIata; }
    public void setDestinoIata(String destinoIata) { this.destinoIata = destinoIata; }
    
    public UUID getVueloId() { return vueloId; }
    public void setVueloId(UUID vueloId) { this.vueloId = vueloId; }
    
    public OffsetDateTime getSlaComprometido() { return slaComprometido; }
    public void setSlaComprometido(OffsetDateTime slaComprometido) { this.slaComprometido = slaComprometido; }
    
    public OffsetDateTime getFechaIngresoVirtual() { return fechaIngresoVirtual; }
    public void setFechaIngresoVirtual(OffsetDateTime fechaIngresoVirtual) { this.fechaIngresoVirtual = fechaIngresoVirtual; }
    
    public boolean isProcesado() { return procesado; }
    public void setProcesado(boolean procesado) { this.procesado = procesado; }
}
