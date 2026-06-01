package com.tasfb2b.backend.shared.infrastructure;

import com.tasfb2b.backend.bc2.application.CsvBaggageLoader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class BaseDataPreloader implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(BaseDataPreloader.class);

    private final CsvBaggageLoader csvBaggageLoader;

    public BaseDataPreloader(CsvBaggageLoader csvBaggageLoader) {
        this.csvBaggageLoader = csvBaggageLoader;
    }

    @Override
    public void run(String... args) {
        if (!csvBaggageLoader.estaBaseCargada()) {
            log.info("Precargando datos base de simulacion en background...");
            new Thread(() -> {
                csvBaggageLoader.cargarBaseDatosSimulacion();
                log.info("Precarga de datos base completada");
            }).start();
        } else {
            log.info("Datos base de simulacion ya cargados, saltando precarga");
        }
    }
}
