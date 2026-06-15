package com.tasfb2b.backend.bc1.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class CargaSimulacionRunner {

    private static final Logger log = LoggerFactory.getLogger(CargaSimulacionRunner.class);

    private final CargaSimulacionService cargaSimulacionService;

    public CargaSimulacionRunner(CargaSimulacionService cargaSimulacionService) {
        this.cargaSimulacionService = cargaSimulacionService;
    }

    @Async
    @EventListener(ApplicationReadyEvent.class)
    public void run() {
        try {
            var resultado = cargaSimulacionService.cargarTodos();
            log.info("Carga automatica completada: {} equipajes insertados desde {} lineas ({} errores)",
                    resultado.totalEquipajes(), resultado.totalLineas(), resultado.lineasError());
        } catch (CargaSimulacionService.CargaException e) {
            log.error("Error en carga automatica: {}", e.getMessage());
        }
    }
}
