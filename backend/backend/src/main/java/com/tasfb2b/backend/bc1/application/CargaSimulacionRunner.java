package com.tasfb2b.backend.bc1.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class CargaSimulacionRunner {

    private static final Logger log = LoggerFactory.getLogger(CargaSimulacionRunner.class);

    private final CargaSimulacionAsyncRunner asyncRunner;

    public CargaSimulacionRunner(CargaSimulacionAsyncRunner asyncRunner) {
        this.asyncRunner = asyncRunner;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        log.info("Delegando carga automatica a hilo async...");
        asyncRunner.cargar();
    }
}
