package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.*;
import com.tasfb2b.backend.bc1.infrastructure.*;
import com.tasfb2b.backend.bc2.domain.*;
import com.tasfb2b.backend.bc2.infrastructure.SesionRepository;
import com.tasfb2b.backend.shared.events.SesionFinalizada;
import com.tasfb2b.backend.shared.infrastructure.RedisCacheService;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TickService {

    private static final Logger log = LoggerFactory.getLogger(TickService.class);
    private static final long TICK_INTERVAL_MS = 5000;
    private static final double VIRTUAL_SECONDS_PER_REAL_SECOND = 120.0;
    private static final long VIRTUAL_MINUTES_PER_TICK = (long) ((TICK_INTERVAL_MS / 1000.0) * VIRTUAL_SECONDS_PER_REAL_SECOND / 60);
    private static final Random RANDOM = new Random();

    private final SesionRepository sesionRepository;
    private final VueloRepository vueloRepository;
    private final EquipajeRepository equipajeRepository;
    private final SegmentoPlanRepository segmentoPlanRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final RedisCacheService redisCacheService;
    private final TelemetriaService telemetriaService;
    private final ObjectMapper objectMapper;
    private final ReplanificacionService replanificacionService;
    private final ApplicationEventPublisher eventPublisher;

    public TickService(SesionRepository sesionRepository,
                       VueloRepository vueloRepository,
                       EquipajeRepository equipajeRepository,
                       SegmentoPlanRepository segmentoPlanRepository,
                       NodoLogisticoRepository nodoRepository,
                       RedisCacheService redisCacheService,
                       TelemetriaService telemetriaService,
                       ObjectMapper objectMapper,
                       ReplanificacionService replanificacionService,
                       ApplicationEventPublisher eventPublisher) {
        this.sesionRepository = sesionRepository;
        this.vueloRepository = vueloRepository;
        this.equipajeRepository = equipajeRepository;
        this.segmentoPlanRepository = segmentoPlanRepository;
        this.nodoRepository = nodoRepository;
        this.redisCacheService = redisCacheService;
        this.telemetriaService = telemetriaService;
        this.objectMapper = objectMapper;
        this.replanificacionService = replanificacionService;
        this.eventPublisher = eventPublisher;
    }

    @Scheduled(fixedRate = TICK_INTERVAL_MS)
    public void tick() {
        List<SesionEjecucion> sesionesActivas = sesionRepository.findByEstado(EstadoSesion.EN_CURSO);
        if (sesionesActivas.isEmpty()) return;

        for (SesionEjecucion sesion : sesionesActivas) {
            try {
                procesarTick(sesion);
            } catch (Exception e) {
                log.error("Error processing tick for session {}: {}", sesion.getId(), e.getMessage(), e);
            }
        }
    }

    private void procesarTick(SesionEjecucion sesion) {
        OffsetDateTime now = OffsetDateTime.now();

        avanzarRelojVirtual(sesion);
        procesarVuelosSalida(sesion);
        procesarVuelosLlegada(sesion);
        evaluarCancelaciones(sesion, now);
        boolean colapso = detectarColapso(sesion, now);
        escribirMetricas(sesion, now);
        telemetriaService.emitirTelemetria(sesion);

        if (colapso) {
            detenerSesionPorColapso(sesion, now);
        }
    }

    private void avanzarRelojVirtual(SesionEjecucion sesion) {
        if (sesion.getDiaHoraVirtual() == null) {
            OffsetDateTime inicio = OffsetDateTime.of(
                    sesion.getFechaInicioVirtual(),
                    sesion.getHoraInicioVirtual(),
                    OffsetDateTime.now().getOffset());
            sesion.setDiaHoraVirtual(inicio);
        } else {
            sesion.setDiaHoraVirtual(sesion.getDiaHoraVirtual().plusMinutes(VIRTUAL_MINUTES_PER_TICK));
        }
        sesion.setSegundosRealesTranscurridos(
                (sesion.getSegundosRealesTranscurridos() != null ? sesion.getSegundosRealesTranscurridos() : 0)
                        + (int) (TICK_INTERVAL_MS / 1000));
        sesionRepository.save(sesion);
    }

    private void procesarVuelosSalida(SesionEjecucion sesion) {
        OffsetDateTime virtual = sesion.getDiaHoraVirtual();
        List<Vuelo> saliendo = vueloRepository.findByEstadoAndHoraSalidaLessThanEqual(
                EstadoVuelo.PROGRAMADO, virtual);

        for (Vuelo vuelo : saliendo) {
            vuelo.setEstado(EstadoVuelo.EN_RUTA);
            vueloRepository.save(vuelo);

            List<SegmentoPlan> segmentos = segmentoPlanRepository.findByVueloIdAndEstado(
                    vuelo.getId(), EstadoSegmento.PENDIENTE);
            for (SegmentoPlan seg : segmentos) {
                seg.setEstado(EstadoSegmento.EN_CURSO);
                segmentoPlanRepository.save(seg);

                if (seg.getPlanViaje() != null && seg.getPlanViaje().getEquipaje() != null) {
                    Equipaje eq = seg.getPlanViaje().getEquipaje();
                    eq.setEstado(EstadoEquipaje.EN_VUELO);
                    eq.setVueloActual(vuelo);
                    equipajeRepository.save(eq);
                }
            }
        }
    }

    private void procesarVuelosLlegada(SesionEjecucion sesion) {
        OffsetDateTime virtual = sesion.getDiaHoraVirtual();
        List<Vuelo> llegando = vueloRepository.findByEstadoAndHoraLlegadaLessThanEqual(
                EstadoVuelo.EN_RUTA, virtual);

        for (Vuelo vuelo : llegando) {
            vuelo.setEstado(EstadoVuelo.COMPLETADO);
            vueloRepository.save(vuelo);

            List<SegmentoPlan> segmentos = segmentoPlanRepository.findByVueloIdAndEstado(
                    vuelo.getId(), EstadoSegmento.EN_CURSO);
            for (SegmentoPlan seg : segmentos) {
                seg.setEstado(EstadoSegmento.COMPLETADO);
                segmentoPlanRepository.save(seg);

                if (seg.getPlanViaje() != null && seg.getPlanViaje().getEquipaje() != null) {
                    Equipaje eq = seg.getPlanViaje().getEquipaje();

                    boolean esUltimoSegmento = seg.getPlanViaje().getSegmentos().stream()
                            .noneMatch(s -> s.getOrden() > seg.getOrden()
                                    && s.getEstado() == EstadoSegmento.PENDIENTE);

                    if (esUltimoSegmento) {
                        eq.setEstado(EstadoEquipaje.ENTREGADO);
                        eq.setVueloActual(null);
                    } else {
                        eq.setEstado(EstadoEquipaje.EN_ALMACEN);
                    }
                    equipajeRepository.save(eq);
                }
            }
        }
    }

    private void evaluarCancelaciones(SesionEjecucion sesion, OffsetDateTime now) {
        BigDecimal prob = sesion.getProbCancelacion();
        if (prob == null || prob.compareTo(BigDecimal.ZERO) <= 0) return;

        List<Vuelo> programados = vueloRepository.findByEstadoAndHoraSalidaLessThanEqual(
                EstadoVuelo.PROGRAMADO, sesion.getDiaHoraVirtual());

        for (Vuelo vuelo : programados) {
            if (RANDOM.nextDouble() < prob.doubleValue()) {
                log.info("Tick cancelacion: vuelo {} cancelado probabilisticamente en sesion {}",
                        vuelo.getCodigoVuelo(), sesion.getId());

                replanificacionService.replanificarEnSesion(
                        sesion.getId(), vuelo.getId(),
                        "Cancelacion probabilistica en tick",
                        sesion.getDiaHoraVirtual());
            }
        }
    }

    private boolean detectarColapso(SesionEjecucion sesion, OffsetDateTime now) {
        BigDecimal rojoMax = sesion.getAlmacenRojoMax();
        if (rojoMax == null) return false;

        List<NodoLogistico> nodos = nodoRepository.findAllByOrderByCodigoIataAsc();
        for (NodoLogistico nodo : nodos) {
            double pct = nodo.getOcupacionPorcentaje();
            if (pct > rojoMax.doubleValue()) {
                log.warn("COLAPSO en sesion {}: nodo {} ocupacion {}% supera umbral rojo {}%",
                        sesion.getId(), nodo.getCodigoIata(), pct, rojoMax);

                sesion.setEstado(EstadoSesion.COLAPSADA);
                sesion.setFechaFinReal(now);
                sesionRepository.save(sesion);

                redisCacheService.setEstadoSesion(sesion.getId(), "COLAPSADA");
                redisCacheService.setMetricasSesion(sesion.getId(), buildMetricasJson(sesion, now, true));

                eventPublisher.publishEvent(new SesionFinalizada(
                        sesion.getId(), "COLAPSADA", now));

                telemetriaService.emitirTelemetria(sesion);
                return true;
            }
        }
        return false;
    }

    private void detenerSesionPorColapso(SesionEjecucion sesion, OffsetDateTime now) {
        log.info("Sesion {} colapsada - ticks detenidos", sesion.getId());
    }

    private void escribirMetricas(SesionEjecucion sesion, OffsetDateTime now) {
        String json = buildMetricasJson(sesion, now, false);
        redisCacheService.setMetricasSesion(sesion.getId(), json);
        redisCacheService.setEstadoSesion(sesion.getId(), sesion.getEstado().name());
    }

    private String buildMetricasJson(SesionEjecucion sesion, OffsetDateTime now, boolean colapsada) {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            root.put("sesion_id", sesion.getId().toString());
            root.put("estado", colapsada ? "COLAPSADA" : sesion.getEstado().name());
            root.put("dia_hora_virtual", sesion.getDiaHoraVirtual() != null
                    ? sesion.getDiaHoraVirtual().toString() : null);
            root.put("segundos_reales_transcurridos",
                    sesion.getSegundosRealesTranscurridos() != null ? sesion.getSegundosRealesTranscurridos() : 0);
            root.put("sla_acumulado_pct",
                    sesion.getSlaAcumuladoPct() != null ? sesion.getSlaAcumuladoPct().doubleValue() : 100.0);
            root.put("vuelos_cancelados",
                    sesion.getVuelosCancelados() != null ? sesion.getVuelosCancelados() : 0);
            root.put("maletas_replanificadas",
                    sesion.getMaletasReplanificadas() != null ? sesion.getMaletasReplanificadas() : 0);
            root.put("timestamp", now.toString());
            return objectMapper.writeValueAsString(root);
        } catch (JacksonException e) {
            log.error("Error building metrics JSON for session {}: {}", sesion.getId(), e.getMessage());
            return "{}";
        }
    }
}
