package com.tasfb2b.backend.bc2.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;

@Component
@Profile("simulacion-local")
public class LocalSimulacionRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(LocalSimulacionRunner.class);

    private final SesionService sesionService;

    public LocalSimulacionRunner(SesionService sesionService) {
        this.sesionService = sesionService;
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("=== INICIANDO SIMULACION LOCAL EN MODO CLI ===");

        CrearSesionRequest.UmbralesRequest umbrales = new CrearSesionRequest.UmbralesRequest(
                new BigDecimal("0"),
                new BigDecimal("70"),
                new BigDecimal("70"),
                new BigDecimal("90"),
                new BigDecimal("90"),
                new BigDecimal("100")
        );

        CrearSesionRequest request = new CrearSesionRequest(
                "SIMULADA",
                LocalDate.now().toString(),
                "00:00:00",
                new BigDecimal("0.05"), // 5% prob cancelacion
                umbrales,
                umbrales
        );

        var res = sesionService.crearSesion(request);
        log.info("Sesion creada con ID: {}", res.id());

        sesionService.iniciarSesion(res.id());
        log.info("Sesion iniciada. El Motor de planificacion (TickService) comenzara a operar y emitir logs en la consola.");
        log.info("No se requiere interaccion con el frontend.");
    }
}
