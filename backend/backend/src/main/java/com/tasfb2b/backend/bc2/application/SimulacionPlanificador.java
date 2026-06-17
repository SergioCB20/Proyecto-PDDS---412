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

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SimulacionPlanificador {

    private static final Logger log = LoggerFactory.getLogger(SimulacionPlanificador.class);

    // Fecha base de los archivos _envios_*.txt
    private static final LocalDate FECHA_BASE_ARCHIVO = LocalDate.of(2026, 1, 2);

    private final SesionRepository sesionRepository;
    private final SimulacionEnrutamientoService enrutamientoService;
    private final SesionReadinessManager readinessManager;
    private final RedisCacheService redisCacheService;
    private final ApplicationEventPublisher eventPublisher;

    // sa_segundos global de fallback (aplicación.properties)
    private final long saSegundosFallback;

    // Rastrea el último momento en que se ejecutó la planificación para cada sesión
    private final Map<UUID, Long> ultimaPlanificacionMs = new ConcurrentHashMap<>();

    public SimulacionPlanificador(SesionRepository sesionRepository,
                                  SimulacionEnrutamientoService enrutamientoService,
                                  SesionReadinessManager readinessManager,
                                  RedisCacheService redisCacheService,
                                  ApplicationEventPublisher eventPublisher,
                                  @Value("${app.simulacion.sa-segundos}") long saSegundosFallback) {
        this.sesionRepository = sesionRepository;
        this.enrutamientoService = enrutamientoService;
        this.readinessManager = readinessManager;
        this.redisCacheService = redisCacheService;
        this.eventPublisher = eventPublisher;
        this.saSegundosFallback = saSegundosFallback;
    }

    /**
     * Corre cada 5 segundos. Internamente decide si ejecutar el planificador ACO
     * para cada sesión según su propio sa_segundos configurado.
     */
    @Scheduled(fixedDelay = 5000)
    public void planificar() {
        List<SesionEjecucion> sesiones = sesionRepository.findByEstado(EstadoSesion.EN_CURSO);
        if (sesiones.isEmpty()) return;

        long ahora = System.currentTimeMillis();

        for (SesionEjecucion sesion : sesiones) {
            if (sesion.getTipo() != TipoSesion.SIMULADA) continue;
            if (sesion.getEstado() != EstadoSesion.EN_CURSO) continue;
            if (!readinessManager.estaLista(sesion.getId())) continue;

            long saMs = (sesion.getSaSegundos() != null ? sesion.getSaSegundos() : saSegundosFallback) * 1000L;
            long ultimaEjecucion = ultimaPlanificacionMs.getOrDefault(sesion.getId(), 0L);

            if ((ahora - ultimaEjecucion) < saMs) continue;

            try {
                ejecutarPlanificacion(sesion);
                ultimaPlanificacionMs.put(sesion.getId(), ahora);
            } catch (Exception e) {
                log.error("Error en planificacion para sesion {}: {}", sesion.getId(), e.getMessage(), e);
            }
        }

        // Limpiar entradas de sesiones que ya no están activas
        ultimaPlanificacionMs.keySet().removeIf(id ->
            sesiones.stream().noneMatch(s -> s.getId().equals(id)));
    }

    private void ejecutarPlanificacion(SesionEjecucion sesion) {
        OffsetDateTime virtual = sesion.getDiaHoraVirtual();
        if (virtual == null) return;

        long saMs = (sesion.getSaSegundos() != null ? sesion.getSaSegundos() : saSegundosFallback) * 1000L;
        OffsetDateTime inicioVentana = virtual;
        OffsetDateTime finVentana = virtual.plusHours(sesion.getVentanaHoras() != null ? sesion.getVentanaHoras() : 4);

        long deltaDias = ChronoUnit.DAYS.between(FECHA_BASE_ARCHIVO, sesion.getFechaInicioVirtual());

        long start = System.nanoTime();

        var resultado = enrutamientoService.enrutarVentana(
                sesion.getId(), inicioVentana, finVentana, deltaDias);

        long elapsedMs = (System.nanoTime() - start) / 1_000_000;

        log.info("Sesion {}: planificacion ventana {}-{}: {} enrutados en {}ms (sa={}ms)",
                sesion.getId(), inicioVentana, finVentana, resultado.enrutados(), elapsedMs, saMs);

        if (elapsedMs > saMs) {
            log.warn("Sesion {}: Ta ({}ms) > sa ({}ms), planificador se solapó",
                    sesion.getId(), elapsedMs, saMs);
        }

        if (resultado.colapso() && sesion.getTipoSimulacion() == TipoSimulacion.HASTA_COLAPSO) {
            log.warn("COLAPSO en sesion {}: equipaje {} no pudo ser enrutado en {}",
                    sesion.getId(), resultado.equipajeColapsoId(), resultado.momentoColapso());

            sesion.setEstado(EstadoSesion.COLAPSADA);
            sesion.setFechaFinReal(OffsetDateTime.now());
            sesionRepository.save(sesion);

            redisCacheService.setEstadoSesion(sesion.getId(), "COLAPSADA");

            eventPublisher.publishEvent(new SesionFinalizada(
                    sesion.getId(), "COLAPSADA", OffsetDateTime.now()));
        }
    }

    /** Limpia el estado interno al detener/finalizar una sesión. */
    public void limpiarSesion(UUID sesionId) {
        ultimaPlanificacionMs.remove(sesionId);
    }
}
