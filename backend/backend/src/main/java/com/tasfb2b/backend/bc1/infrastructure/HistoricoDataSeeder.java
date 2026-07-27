package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.VueloService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class HistoricoDataSeeder {

    private static final Logger log = LoggerFactory.getLogger(HistoricoDataSeeder.class);

    private final VueloService vueloService;

    public HistoricoDataSeeder(VueloService vueloService) {
        this.vueloService = vueloService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seed() {
        log.info("=== HistoricoDataSeeder: verificando datos historicos ===");
        int generados = vueloService.generarHistoricos();
        if (generados > 0) {
            log.info("=== HistoricoDataSeeder: {} vuelos historicos generados ===", generados);
        } else if (generados == 0) {
            log.info("=== HistoricoDataSeeder: datos historicos ya existen, omitiendo ===");
        } else {
            log.warn("=== HistoricoDataSeeder: error generando historicos (revisar logs previos) ===");
        }
    }
}
