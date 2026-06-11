package com.tasfb2b.backend.bc2.application;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public record TiempoInterno(int horaDelDia, int dia) {

    public static final ZoneOffset UTC = ZoneOffset.UTC;
    public static final int HORAS_POR_DIA = 24;

    public static TiempoInterno desde(OffsetDateTime fechaHora, OffsetDateTime referencia) {
        if (referencia == null) {
            referencia = OffsetDateTime.now(UTC);
        }
        LocalDate refDate = referencia.toLocalDate();
        LocalTime refTime = referencia.toLocalTime();

        long diffHoras = java.time.Duration.between(
                referencia.withOffsetSameInstant(UTC),
                fechaHora.withOffsetSameInstant(UTC)).toHours();

        if (diffHoras < 0) diffHoras = 0;

        int horaDelDia = refTime.getHour();
        int dia = 0;

        long horasAcumuladas = diffHoras;
        horaDelDia = (refTime.getHour() + (int) (horasAcumuladas % HORAS_POR_DIA)) % HORAS_POR_DIA;
        dia = (int) (horasAcumuladas / HORAS_POR_DIA);

        return new TiempoInterno(horaDelDia, dia);
    }

    public static TiempoInterno desdeSolicitud(OffsetDateTime fechaSolicitud, OffsetDateTime inicioSimulacion) {
        return desde(fechaSolicitud, inicioSimulacion);
    }

    public static TiempoInterno desdeSla(OffsetDateTime slaComprometido, OffsetDateTime inicioSimulacion) {
        return desde(slaComprometido, inicioSimulacion);
    }

    public int totalHoras() {
        return dia * HORAS_POR_DIA + horaDelDia;
    }
}
