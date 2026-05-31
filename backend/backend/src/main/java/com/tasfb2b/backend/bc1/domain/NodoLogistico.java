package com.tasfb2b.backend.bc1.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import java.util.Map;

@Entity
@Table(name = "nodos_logisticos")
public class NodoLogistico {

    @Id
    private UUID id;

    @Column(name = "codigo_iata", nullable = false, unique = true, length = 10)
    private String codigoIata;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false, precision = 9, scale = 6)
    private BigDecimal latitud;

    @Column(nullable = false, precision = 9, scale = 6)
    private BigDecimal longitud;

    @Column(name = "capacidad_almacen", nullable = false)
    private Integer capacidadAlmacen;

    @Column(name = "ocupacion_actual", nullable = false)
    private Integer ocupacionActual = 0;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Continente continente;

    public NodoLogistico() {}

    public NodoLogistico(UUID id, String codigoIata, String nombre, BigDecimal latitud, BigDecimal longitud, Integer capacidadAlmacen, Continente continente) {
        this.id = id;
        this.codigoIata = codigoIata;
        this.nombre = nombre;
        this.latitud = latitud;
        this.longitud = longitud;
        this.capacidadAlmacen = capacidadAlmacen;
        this.ocupacionActual = 0;
        this.continente = continente;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getCodigoIata() { return codigoIata; }
    public void setCodigoIata(String codigoIata) { this.codigoIata = codigoIata; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public BigDecimal getLatitud() { return latitud; }
    public void setLatitud(BigDecimal latitud) { this.latitud = latitud; }

    public BigDecimal getLongitud() { return longitud; }
    public void setLongitud(BigDecimal longitud) { this.longitud = longitud; }

    public Integer getCapacidadAlmacen() { return capacidadAlmacen; }
    public void setCapacidadAlmacen(Integer capacidadAlmacen) { this.capacidadAlmacen = capacidadAlmacen; }

    public Integer getOcupacionActual() { return ocupacionActual; }
    public void setOcupacionActual(Integer ocupacionActual) { this.ocupacionActual = ocupacionActual; }

    public Continente getContinente() { return continente; }
    public void setContinente(Continente continente) { this.continente = continente; }

    public double getOcupacionPorcentaje() {
        if (capacidadAlmacen == null || capacidadAlmacen == 0) return 0;
        return (ocupacionActual * 100.0) / capacidadAlmacen;
    }

    public static Continente continentePorIata(String codigoIata) {
        return CONTINENTE_MAP.getOrDefault(codigoIata.toUpperCase(), null);
    }

    private static final Map<String, Continente> CONTINENTE_MAP = Map.<String, Continente>ofEntries(
        Map.entry("SKBO", Continente.AMERICA_DEL_SUR),
        Map.entry("SEQM", Continente.AMERICA_DEL_SUR),
        Map.entry("SVMI", Continente.AMERICA_DEL_SUR),
        Map.entry("SBBR", Continente.AMERICA_DEL_SUR),
        Map.entry("SPIM", Continente.AMERICA_DEL_SUR),
        Map.entry("SLLP", Continente.AMERICA_DEL_SUR),
        Map.entry("SCEL", Continente.AMERICA_DEL_SUR),
        Map.entry("SABE", Continente.AMERICA_DEL_SUR),
        Map.entry("SGAS", Continente.AMERICA_DEL_SUR),
        Map.entry("SUAA", Continente.AMERICA_DEL_SUR),
        Map.entry("LATI", Continente.EUROPA),
        Map.entry("EDDI", Continente.EUROPA),
        Map.entry("LOWW", Continente.EUROPA),
        Map.entry("EBCI", Continente.EUROPA),
        Map.entry("UMMS", Continente.EUROPA),
        Map.entry("LBSF", Continente.EUROPA),
        Map.entry("LKPR", Continente.EUROPA),
        Map.entry("LDZA", Continente.EUROPA),
        Map.entry("EKCH", Continente.EUROPA),
        Map.entry("EHAM", Continente.EUROPA),
        Map.entry("VIDP", Continente.ASIA),
        Map.entry("OSDI", Continente.ASIA),
        Map.entry("OERK", Continente.ASIA),
        Map.entry("OMDB", Continente.ASIA),
        Map.entry("OAKB", Continente.ASIA),
        Map.entry("OOMS", Continente.ASIA),
        Map.entry("OYSN", Continente.ASIA),
        Map.entry("OPKC", Continente.ASIA),
        Map.entry("UBBB", Continente.ASIA),
        Map.entry("OJAI", Continente.ASIA)
    );
}