package com.tasfb2b.backend.bc2.application;

import java.math.BigDecimal;

public record CrearSesionRequest(
    String tipo,
    String fecha_inicio_virtual,
    String hora_inicio_virtual,
    BigDecimal prob_cancelacion,
    String tipo_simulacion,
    Integer ventana_horas,
    Integer duracion_dias,
    UmbralesRequest umbrales_almacen,
    UmbralesRequest umbrales_vuelo
) {
    public record UmbralesRequest(
        BigDecimal verde_min,
        BigDecimal verde_max,
        BigDecimal ambar_min,
        BigDecimal ambar_max,
        BigDecimal rojo_min,
        BigDecimal rojo_max
    ) {}
}