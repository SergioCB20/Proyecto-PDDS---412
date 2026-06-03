package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc2.domain.EstadoSesion;
import com.tasfb2b.backend.bc2.domain.SesionEjecucion;
import com.tasfb2b.backend.bc2.domain.TipoSimulacion;
import com.tasfb2b.backend.bc2.domain.TipoSesion;
import com.tasfb2b.backend.bc2.infrastructure.SesionRepository;
import com.tasfb2b.backend.shared.events.SesionFinalizada;
import com.tasfb2b.backend.shared.infrastructure.RedisCacheService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class SimulacionPlanificador {

    private static final Logger log = LoggerFactory.getLogger(SimulacionPlanificador.class);

    private final SesionRepository sesionRepository;
    private final SimulacionEnrutamientoService enrutamientoService;
    private final RedisCacheService redisCacheService;
    private final ApplicationEventPublisher eventPublisher;
    private final long saMs;

    public SimulacionPlanificador(SesionRepository sesionRepository,
                                  SimulacionEnrutamientoService enrutamientoService,
                                  RedisCacheService redisCacheService,
                                  ApplicationEventPublisher eventPublisher,
                                  @Value("${app.simulacion.sa-segundos}") long saSegundos) {
        this.sesionRepository = sesionRepository;
        this.enrutamientoService = enrutamientoService;
        this.redisCacheService = redisCacheService;
        this.eventPublisher = eventPublisher;
        this.saMs = saSegundos * 1000;
    }

    @Scheduled(fixedDelayString = "${app.simulacion.sa-segundos}000")
    public void planificar() {
        List<SesionEjecucion> sesiones = sesionRepository.findByEstado(EstadoSesion.EN_CURSO);
        if (sesiones.isEmpty()) return;

        for (SesionEjecucion sesion : sesiones) {
            if (sesion.getTipo() != TipoSesion.SIMULADA) continue;
            if (sesion.getEstado() != EstadoSesion.EN_CURSO) continue;

            try {
                ejecutarPlanificacion(sesion);
            } catch (Exception e) {
                log.error("Error en planificacion para sesion {}: {}", sesion.getId(), e.getMessage(), e);
            }
        }
    }

    private void ejecutarPlanificacion(SesionEjecucion sesion) {
        OffsetDateTime virtual = sesion.getDiaHoraVirtual();
        if (virtual == null) return;

        OffsetDateTime inicioVentana = virtual;
        OffsetDateTime finVentana = virtual.plusHours(sesion.getVentanaHoras());

        long start = System.nanoTime();

        var resultado = enrutamientoService.enrutarVentana(
                sesion.getId(), inicioVentana, finVentana);

        long elapsedMs = (System.nanoTime() - start) / 1_000_000;

        log.info("Sesion {}: planificacion ventana {}-{}: {} enrutados en {}ms (Ta)",
                sesion.getId(), inicioVentana, finVentana, resultado.enrutados(), elapsedMs);

        if (elapsedMs > saMs) {
            log.warn("Sesion {}: Ta ({}ms) > Sa ({}ms), planificador podria solaparse",
                    sesion.getId(), elapsedMs, saMs);
        }

        if (resultado.colapso() && sesion.getTipoSimulacion() == TipoSimulacion.HASTA_COLAPSO) {
            log.warn("COLAPSO en sesion {}: equipaje {} no pudo ser enrutado en {}",
                    sesion.getId(), resultado.equipajeColapsoId(), resultado.momentoColapso());

            sesion.setEstado(com.tasfb2b.backend.bc2.domain.EstadoSesion.COLAPSADA);
            sesion.setFechaFinReal(OffsetDateTime.now());
            sesionRepository.save(sesion);

            redisCacheService.setEstadoSesion(sesion.getId(), "COLAPSADA");

            eventPublisher.publishEvent(new SesionFinalizada(
                    sesion.getId(), "COLAPSADA", OffsetDateTime.now()));
        }
    }
}
