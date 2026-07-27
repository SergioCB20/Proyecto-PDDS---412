package com.tasfb2b.backend.bc1.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class CargaSimulacionRunner {

    private static final Logger log = LoggerFactory.getLogger(CargaSimulacionRunner.class);

    private final CargaSimulacionAsyncRunner asyncRunner;
    private final boolean habilitada;

    public CargaSimulacionRunner(
            CargaSimulacionAsyncRunner asyncRunner,
            @Value("${app.simulacion.carga-automatica:true}") boolean habilitada) {
        this.asyncRunner = asyncRunner;
        this.habilitada = habilitada;
    }

    /**
     * Carga el juego de datos de simulación al arrancar, si la tabla está vacía.
     *
     * <p>Se puede desactivar con {@code app.simulacion.carga-automatica=false}
     * (env {@code CARGA_AUTOMATICA}). Hace falta para el escenario de colapso: ahí se
     * purga y se recarga una ventana repetidamente, y como esta carga corre en un hilo
     * async, su comprobación de "¿hay equipajes?" puede caer DESPUÉS de un TRUNCATE y
     * acabar inyectando el dataset de simulación encima del de colapso.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        if (!habilitada) {
            log.info("Carga automatica desactivada (app.simulacion.carga-automatica=false)");
            return;
        }
        log.info("Delegando carga automatica a hilo async...");
        asyncRunner.cargar();
    }
}
