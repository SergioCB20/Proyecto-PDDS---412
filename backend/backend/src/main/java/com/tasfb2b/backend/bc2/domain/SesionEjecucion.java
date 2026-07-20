package com.tasfb2b.backend.bc2.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "sesiones_ejecucion")
public class SesionEjecucion {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoSesion tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoSesion estado;

    @Column(name = "fecha_inicio_virtual", nullable = false)
    private LocalDate fechaInicioVirtual;

    @Column(name = "hora_inicio_virtual", nullable = false)
    private LocalTime horaInicioVirtual;

    @Column(name = "fecha_inicio_real")
    private OffsetDateTime fechaInicioReal;

    @Column(name = "fecha_fin_real")
    private OffsetDateTime fechaFinReal;

    @Column(name = "almacen_verde_min", precision = 5, scale = 2)
    private BigDecimal almacenVerdeMin = BigDecimal.ZERO;

    @Column(name = "almacen_verde_max", precision = 5, scale = 2)
    private BigDecimal almacenVerdeMax = new BigDecimal("70");

    @Column(name = "almacen_ambar_min", precision = 5, scale = 2)
    private BigDecimal almacenAmbarMin = new BigDecimal("70");

    @Column(name = "almacen_ambar_max", precision = 5, scale = 2)
    private BigDecimal almacenAmbarMax = new BigDecimal("90");

    @Column(name = "almacen_rojo_min", precision = 5, scale = 2)
    private BigDecimal almacenRojoMin = new BigDecimal("90");

    @Column(name = "almacen_rojo_max", precision = 5, scale = 2)
    private BigDecimal almacenRojoMax = new BigDecimal("100");

    @Column(name = "vuelo_verde_min", precision = 5, scale = 2)
    private BigDecimal vueloVerdeMin = BigDecimal.ZERO;

    @Column(name = "vuelo_verde_max", precision = 5, scale = 2)
    private BigDecimal vueloVerdeMax = new BigDecimal("70");

    @Column(name = "vuelo_ambar_min", precision = 5, scale = 2)
    private BigDecimal vueloAmbarMin = new BigDecimal("70");

    @Column(name = "vuelo_ambar_max", precision = 5, scale = 2)
    private BigDecimal vueloAmbarMax = new BigDecimal("90");

    @Column(name = "vuelo_rojo_min", precision = 5, scale = 2)
    private BigDecimal vueloRojoMin = new BigDecimal("90");

    @Column(name = "vuelo_rojo_max", precision = 5, scale = 2)
    private BigDecimal vueloRojoMax = new BigDecimal("100");

    @Column(name = "dia_hora_virtual")
    private OffsetDateTime diaHoraVirtual;

    @Column(name = "segundos_reales_transcurridos")
    private Integer segundosRealesTranscurridos = 0;

    @Column(name = "sla_acumulado_pct", precision = 5, scale = 2)
    private BigDecimal slaAcumuladoPct = BigDecimal.ZERO;

    @Column(name = "vuelos_cancelados")
    private Integer vuelosCancelados = 0;

    @Column(name = "maletas_replanificadas")
    private Integer maletasReplanificadas = 0;

    @Column(name = "prob_cancelacion", precision = 5, scale = 2)
    private BigDecimal probCancelacion = BigDecimal.ZERO;

    @Column(name = "tipo_simulacion", length = 20)
    @Enumerated(EnumType.STRING)
    private TipoSimulacion tipoSimulacion = TipoSimulacion.VENTANA_FIJA;

    @Column(name = "ventana_horas")
    private Integer ventanaHoras = 2;

    @Column(name = "duracion_dias")
    private Integer duracionDias = 5;

    @Column(name = "k")
    private Double k = 120.0;

    @Column(name = "sa_segundos")
    private Integer saSegundos = 30;

    @Column(name = "fecha_alineada_a")
    private LocalDate fechaAlineadaA;

    @Column(name = "fecha_filtro_desde")
    private OffsetDateTime fechaFiltroDesde;

    @Column(name = "fecha_filtro_hasta")
    private OffsetDateTime fechaFiltroHasta;

    @Column(name = "dispositivo_id", length = 36)
    private String dispositivoId;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public SesionEjecucion() {}

    public SesionEjecucion(UUID id, TipoSesion tipo, LocalDate fechaInicioVirtual, LocalTime horaInicioVirtual) {
        this.id = id;
        this.tipo = tipo;
        this.fechaInicioVirtual = fechaInicioVirtual;
        this.horaInicioVirtual = horaInicioVirtual;
        this.estado = EstadoSesion.CONFIGURADA;
        this.createdAt = OffsetDateTime.now();
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public TipoSesion getTipo() { return tipo; }
    public void setTipo(TipoSesion tipo) { this.tipo = tipo; }

    public EstadoSesion getEstado() { return estado; }
    public void setEstado(EstadoSesion estado) { this.estado = estado; }

    public LocalDate getFechaInicioVirtual() { return fechaInicioVirtual; }
    public void setFechaInicioVirtual(LocalDate fechaInicioVirtual) { this.fechaInicioVirtual = fechaInicioVirtual; }

    public LocalTime getHoraInicioVirtual() { return horaInicioVirtual; }
    public void setHoraInicioVirtual(LocalTime horaInicioVirtual) { this.horaInicioVirtual = horaInicioVirtual; }

    public OffsetDateTime getFechaInicioReal() { return fechaInicioReal; }
    public void setFechaInicioReal(OffsetDateTime fechaInicioReal) { this.fechaInicioReal = fechaInicioReal; }

    public OffsetDateTime getFechaFinReal() { return fechaFinReal; }
    public void setFechaFinReal(OffsetDateTime fechaFinReal) { this.fechaFinReal = fechaFinReal; }

    public BigDecimal getAlmacenVerdeMin() { return almacenVerdeMin; }
    public void setAlmacenVerdeMin(BigDecimal almacenVerdeMin) { this.almacenVerdeMin = almacenVerdeMin; }

    public BigDecimal getAlmacenVerdeMax() { return almacenVerdeMax; }
    public void setAlmacenVerdeMax(BigDecimal almacenVerdeMax) { this.almacenVerdeMax = almacenVerdeMax; }

    public BigDecimal getAlmacenAmbarMin() { return almacenAmbarMin; }
    public void setAlmacenAmbarMin(BigDecimal almacenAmbarMin) { this.almacenAmbarMin = almacenAmbarMin; }

    public BigDecimal getAlmacenAmbarMax() { return almacenAmbarMax; }
    public void setAlmacenAmbarMax(BigDecimal almacenAmbarMax) { this.almacenAmbarMax = almacenAmbarMax; }

    public BigDecimal getAlmacenRojoMin() { return almacenRojoMin; }
    public void setAlmacenRojoMin(BigDecimal almacenRojoMin) { this.almacenRojoMin = almacenRojoMin; }

    public BigDecimal getAlmacenRojoMax() { return almacenRojoMax; }
    public void setAlmacenRojoMax(BigDecimal almacenRojoMax) { this.almacenRojoMax = almacenRojoMax; }

    public BigDecimal getVueloVerdeMin() { return vueloVerdeMin; }
    public void setVueloVerdeMin(BigDecimal vueloVerdeMin) { this.vueloVerdeMin = vueloVerdeMin; }

    public BigDecimal getVueloVerdeMax() { return vueloVerdeMax; }
    public void setVueloVerdeMax(BigDecimal vueloVerdeMax) { this.vueloVerdeMax = vueloVerdeMax; }

    public BigDecimal getVueloAmbarMin() { return vueloAmbarMin; }
    public void setVueloAmbarMin(BigDecimal vueloAmbarMin) { this.vueloAmbarMin = vueloAmbarMin; }

    public BigDecimal getVueloAmbarMax() { return vueloAmbarMax; }
    public void setVueloAmbarMax(BigDecimal vueloAmbarMax) { this.vueloAmbarMax = vueloAmbarMax; }

    public BigDecimal getVueloRojoMin() { return vueloRojoMin; }
    public void setVueloRojoMin(BigDecimal vueloRojoMin) { this.vueloRojoMin = vueloRojoMin; }

    public BigDecimal getVueloRojoMax() { return vueloRojoMax; }
    public void setVueloRojoMax(BigDecimal vueloRojoMax) { this.vueloRojoMax = vueloRojoMax; }

    public OffsetDateTime getDiaHoraVirtual() { return diaHoraVirtual; }
    public void setDiaHoraVirtual(OffsetDateTime diaHoraVirtual) { this.diaHoraVirtual = diaHoraVirtual; }

    public Integer getSegundosRealesTranscurridos() { return segundosRealesTranscurridos; }
    public void setSegundosRealesTranscurridos(Integer segundosRealesTranscurridos) { this.segundosRealesTranscurridos = segundosRealesTranscurridos; }

    public BigDecimal getSlaAcumuladoPct() { return slaAcumuladoPct; }
    public void setSlaAcumuladoPct(BigDecimal slaAcumuladoPct) { this.slaAcumuladoPct = slaAcumuladoPct; }

    public Integer getVuelosCancelados() { return vuelosCancelados; }
    public void setVuelosCancelados(Integer vuelosCancelados) { this.vuelosCancelados = vuelosCancelados; }

    public Integer getMaletasReplanificadas() { return maletasReplanificadas; }
    public void setMaletasReplanificadas(Integer maletasReplanificadas) { this.maletasReplanificadas = maletasReplanificadas; }

    public BigDecimal getProbCancelacion() { return probCancelacion; }
    public void setProbCancelacion(BigDecimal probCancelacion) { this.probCancelacion = probCancelacion; }

    public String getDispositivoId() { return dispositivoId; }
    public void setDispositivoId(String dispositivoId) { this.dispositivoId = dispositivoId; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public TipoSimulacion getTipoSimulacion() { return tipoSimulacion; }
    public void setTipoSimulacion(TipoSimulacion tipoSimulacion) { this.tipoSimulacion = tipoSimulacion; }

    public Integer getVentanaHoras() { return ventanaHoras; }
    public void setVentanaHoras(Integer ventanaHoras) { this.ventanaHoras = ventanaHoras; }

    public Integer getDuracionDias() { return duracionDias; }
    public void setDuracionDias(Integer duracionDias) { this.duracionDias = duracionDias; }

    public Double getK() { return k; }
    public void setK(Double k) { this.k = k; }

    public Integer getSaSegundos() { return saSegundos; }
    public void setSaSegundos(Integer saSegundos) { this.saSegundos = saSegundos; }

    public LocalDate getFechaAlineadaA() { return fechaAlineadaA; }
    public void setFechaAlineadaA(LocalDate fechaAlineadaA) { this.fechaAlineadaA = fechaAlineadaA; }

    public OffsetDateTime getFechaFiltroDesde() { return fechaFiltroDesde; }
    public void setFechaFiltroDesde(OffsetDateTime fechaFiltroDesde) { this.fechaFiltroDesde = fechaFiltroDesde; }

    public OffsetDateTime getFechaFiltroHasta() { return fechaFiltroHasta; }
    public void setFechaFiltroHasta(OffsetDateTime fechaFiltroHasta) { this.fechaFiltroHasta = fechaFiltroHasta; }
}