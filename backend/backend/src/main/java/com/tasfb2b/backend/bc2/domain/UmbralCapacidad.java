package com.tasfb2b.backend.bc2.domain;

import java.math.BigDecimal;

public record UmbralCapacidad(BigDecimal verdeMax, BigDecimal ambarMax) {

    public String evaluar(double pct) {
        if (pct <= verdeMax.doubleValue()) return "VERDE";
        if (pct <= ambarMax.doubleValue()) return "AMBAR";
        return "ROJO";
    }

    public static UmbralCapacidad desdeAlmacen(SesionEjecucion sesion) {
        return new UmbralCapacidad(sesion.getAlmacenVerdeMax(), sesion.getAlmacenAmbarMax());
    }

    public static UmbralCapacidad desdeVuelo(SesionEjecucion sesion) {
        return new UmbralCapacidad(sesion.getVueloVerdeMax(), sesion.getVueloAmbarMax());
    }
}
