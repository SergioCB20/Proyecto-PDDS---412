package com.tasfb2b.backend.bc1.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class CargaSimulacionAsyncRunner {

    private static final Logger log = LoggerFactory.getLogger(CargaSimulacionAsyncRunner.class);

    private final CargaSimulacionService cargaSimulacionService;

    public CargaSimulacionAsyncRunner(CargaSimulacionService cargaSimulacionService) {
        this.cargaSimulacionService = cargaSimulacionService;
    }

    @Async
    public void cargar() {
        try {
            var resultado = cargaSimulacionService.cargarTodos(false);
            log.info("Carga automatica completada: {} equipajes insertados desde {} lineas ({} errores)",
                    resultado.totalEquipajes(), resultado.totalLineas(), resultado.lineasError());
        } catch (CargaSimulacionService.CargaException e) {
            log.error("Error en carga automatica: {}", e.getMessage());
        }
    }
}
