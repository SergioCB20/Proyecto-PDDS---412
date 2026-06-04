package com.tasfb2b.backend.bc1.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class CargaSimulacionRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CargaSimulacionRunner.class);

    private final CargaSimulacionService cargaSimulacionService;

    public CargaSimulacionRunner(CargaSimulacionService cargaSimulacionService) {
        this.cargaSimulacionService = cargaSimulacionService;
    }

    @Override
    public void run(String... args) {
        try {
            var resultado = cargaSimulacionService.cargarTodos();
            log.info("Carga automatica completada: {} equipajes insertados desde {} lineas ({} errores)",
                    resultado.totalEquipajes(), resultado.totalLineas(), resultado.lineasError());
        } catch (CargaSimulacionService.CargaException e) {
            log.error("Error en carga automatica: {}", e.getMessage());
        }
    }
}
