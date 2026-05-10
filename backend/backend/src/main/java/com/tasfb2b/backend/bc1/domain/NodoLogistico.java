package com.tasfb2b.backend.bc1.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

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

    public NodoLogistico() {}

    public NodoLogistico(UUID id, String codigoIata, String nombre, BigDecimal latitud, BigDecimal longitud, Integer capacidadAlmacen) {
        this.id = id;
        this.codigoIata = codigoIata;
        this.nombre = nombre;
        this.latitud = latitud;
        this.longitud = longitud;
        this.capacidadAlmacen = capacidadAlmacen;
        this.ocupacionActual = 0;
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

    public double getOcupacionPorcentaje() {
        if (capacidadAlmacen == null || capacidadAlmacen == 0) return 0;
        return (ocupacionActual * 100.0) / capacidadAlmacen;
    }
}