package com.tasfb2b.backend.shared;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;

public class SLACalculator {

    private SLACalculator() {}

    public static OffsetDateTime calcularSla(
            String origenContinente,
            String destinoContinente,
            LocalDateTime fechaHoraLocal,
            ZoneId zonaOrigen) {

        OffsetDateTime utc = fechaHoraLocal
                .atZone(zonaOrigen)
                .toOffsetDateTime()
                .withOffsetSameInstant(ZoneOffset.UTC);

        boolean mismoContinente = origenContinente != null
                && origenContinente.equals(destinoContinente);

        if (mismoContinente) {
            return utc.plusHours(24);
        }
        return utc.plusHours(48);
    }
}
