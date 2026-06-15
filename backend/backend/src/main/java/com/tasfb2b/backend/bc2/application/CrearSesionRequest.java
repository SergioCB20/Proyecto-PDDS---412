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
    /**
     * Factor tiempo_virtual/tiempo_real. Con tick=5s: k=120→60 min real, k=240→30 min real.
     * Rango válido para simulación 5D: 120–240. Default: 120.
     */
    Double k,
    /**
     * Intervalo en segundos reales entre ejecuciones del planificador ACO (salto del algoritmo).
     * Default: 30s.
     */
    Integer sa_segundos,
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