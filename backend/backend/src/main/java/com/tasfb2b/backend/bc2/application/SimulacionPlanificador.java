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

import jakarta.annotation.PostConstruct;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SimulacionPlanificador {

    private static final Logger log = LoggerFactory.getLogger(SimulacionPlanificador.class);

    private final SesionRepository sesionRepository;
    private final SimulacionEnrutamientoService enrutamientoService;
    private final SesionReadinessManager readinessManager;
    private final SesionLockManager lockManager;
    private final RedisCacheService redisCacheService;
    private final ApplicationEventPublisher eventPublisher;

    // sa_segundos global de fallback (application.properties)
    private final long saSegundosFallback;

    // ventana_horas desde application.properties (no desde la sesión en BD)
    private final int ventanaHorasApp;

    // Rastrea el último momento en que se ejecutó la planificación para cada sesión
    private final Map<UUID, Long> ultimaPlanificacionMs = new ConcurrentHashMap<>();

    /** Último resultado de planificación (tiempo + lista de equipajes) por sesión. */
    private final Map<UUID, PlanificacionReciente> ultimasPlanificaciones = new ConcurrentHashMap<>();

    public record PlanificacionReciente(long tiempoMs, List<UUID> equipajesEnrutados) {}

    public SimulacionPlanificador(SesionRepository sesionRepository,
                                  SimulacionEnrutamientoService enrutamientoService,
                                  SesionReadinessManager readinessManager,
                                  SesionLockManager lockManager,
                                  RedisCacheService redisCacheService,
                                  ApplicationEventPublisher eventPublisher,
                                  @Value("${app.simulacion.sa-segundos}") long saSegundosFallback,
                                  @Value("${app.simulacion.ventana-horas:4}") int ventanaHorasApp) {
        this.sesionRepository = sesionRepository;
        this.enrutamientoService = enrutamientoService;
        this.readinessManager = readinessManager;
        this.lockManager = lockManager;
        this.redisCacheService = redisCacheService;
        this.eventPublisher = eventPublisher;
        this.saSegundosFallback = saSegundosFallback;
        this.ventanaHorasApp = ventanaHorasApp;
    }

    /** Al arrancar, marca como listas todas las sesiones EN_CURSO que sobrevivieron un reinicio. */
    @PostConstruct
    public void recuperarSesionesEnCurso() {
        List<SesionEjecucion> activas = sesionRepository.findByEstado(EstadoSesion.EN_CURSO);
        for (SesionEjecucion s : activas) {
            if (s.getTipo() == TipoSesion.SIMULADA) {
                readinessManager.marcarLista(s.getId());
                log.info("Sesion {} recuperada tras reinicio, marcada lista para planificacion", s.getId());
            }
        }
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

            // Serializa con el tick (corren en hilos distintos del scheduler):
            // ambos mutan segmentos_plan/vuelos/nodos de la MISMA sesión.
            var lock = lockManager.obtener(sesion.getId());
            lock.lock();
            try {
                ejecutarPlanificacion(sesion);
                ultimaPlanificacionMs.put(sesion.getId(), ahora);
            } catch (Exception e) {
                log.error("Error en planificacion para sesion {}: {}", sesion.getId(), e.getMessage(), e);
            } finally {
                lock.unlock();
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
        OffsetDateTime finVentana = virtual.plusHours(ventanaHorasApp);

        long start = System.nanoTime();

        var resultado = enrutamientoService.enrutarVentana(
                sesion.getId(), inicioVentana, finVentana);

        long elapsedMs = (System.nanoTime() - start) / 1_000_000;

        // Cache del último resultado para el endpoint ultima-planificacion
        ultimasPlanificaciones.put(sesion.getId(),
                new PlanificacionReciente(elapsedMs, resultado.equipajesEnrutados()));

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

    /** Devuelve la última planificación cacheada para una sesión, o null. */
    public PlanificacionReciente obtenerUltimaPlanificacion(UUID sesionId) {
        return ultimasPlanificaciones.get(sesionId);
    }

    /** Devuelve el último tiempo de planificación en ms, o null si nunca planificó. */
    public Long obtenerUltimoTiempoPlanificacionMs(UUID sesionId) {
        var p = ultimasPlanificaciones.get(sesionId);
        return p != null ? p.tiempoMs() : null;
    }

    /** Limpia el estado interno al detener/finalizar una sesión. */
    public void limpiarSesion(UUID sesionId) {
        ultimaPlanificacionMs.remove(sesionId);
        ultimasPlanificaciones.remove(sesionId);
        lockManager.eliminar(sesionId);
    }
}
