package com.tasfb2b.backend.bc2.application;

import java.util.List;

public record RutaResult(
        List<SegmentoInfo> segmentos,
        boolean exitoso,
        String mensajeError
) {
    public static RutaResult sinRuta(String error) {
        return new RutaResult(List.of(), false, error);
    }
}
