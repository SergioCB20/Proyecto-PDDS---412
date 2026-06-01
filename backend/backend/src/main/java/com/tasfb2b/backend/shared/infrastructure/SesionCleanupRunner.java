package com.tasfb2b.backend.shared.infrastructure;

import com.tasfb2b.backend.bc2.domain.EstadoSesion;
import com.tasfb2b.backend.bc2.domain.SesionEjecucion;
import com.tasfb2b.backend.bc2.infrastructure.SesionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;

@Component
public class SesionCleanupRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SesionCleanupRunner.class);

    private final SesionRepository sesionRepository;
    private final RedisCacheService redisCacheService;

    public SesionCleanupRunner(SesionRepository sesionRepository, RedisCacheService redisCacheService) {
        this.sesionRepository = sesionRepository;
        this.redisCacheService = redisCacheService;
    }

    @Override
    public void run(String... args) {
        List<SesionEjecucion> activas = sesionRepository.findByEstado(EstadoSesion.EN_CURSO);
        activas.addAll(sesionRepository.findByEstado(EstadoSesion.PAUSADA));

        if (activas.isEmpty()) return;

        log.info("Finalizando {} sesiones activas de ejecuciones anteriores...", activas.size());
        for (SesionEjecucion s : activas) {
            s.setEstado(EstadoSesion.FINALIZADA);
            s.setFechaFinReal(OffsetDateTime.now());
            sesionRepository.save(s);
            redisCacheService.eliminarMetricasSesion(s.getId());
            log.info("Sesion {} finalizada por reinicio", s.getId());
        }
    }
}
