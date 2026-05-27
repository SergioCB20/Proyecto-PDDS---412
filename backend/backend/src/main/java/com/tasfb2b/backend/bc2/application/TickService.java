package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.*;
import com.tasfb2b.backend.bc1.infrastructure.*;
import com.tasfb2b.backend.bc2.domain.*;
import com.tasfb2b.backend.bc2.infrastructure.*;
import com.tasfb2b.backend.shared.events.VueloCanceladoEvent;
import com.tasfb2b.backend.shared.infrastructure.RedisCacheService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
    private final EventoCancelacionRepository eventoCancelacionRepository;
    private final LoteReplanificacionRepository loteReplanificacionRepository;
    private final RedisCacheService redisCacheService;
    private final ApplicationEventPublisher eventPublisher;
    private final TelemetriaService telemetriaService;
    private final ObjectMapper objectMapper;

    public TickService(SesionRepository sesionRepository,
                       VueloRepository vueloRepository,
                       EquipajeRepository equipajeRepository,
                       SegmentoPlanRepository segmentoPlanRepository,
                       NodoLogisticoRepository nodoRepository,
                       EventoCancelacionRepository eventoCancelacionRepository,
                       LoteReplanificacionRepository loteReplanificacionRepository,
                       RedisCacheService redisCacheService,
                       ApplicationEventPublisher eventPublisher,
                       TelemetriaService telemetriaService,
                       ObjectMapper objectMapper) {
        this.sesionRepository = sesionRepository;
        this.vueloRepository = vueloRepository;
        this.equipajeRepository = equipajeRepository;
        this.segmentoPlanRepository = segmentoPlanRepository;
        this.nodoRepository = nodoRepository;
        this.eventoCancelacionRepository = eventoCancelacionRepository;
        this.loteReplanificacionRepository = loteReplanificacionRepository;
        this.redisCacheService = redisCacheService;
        this.eventPublisher = eventPublisher;
        this.telemetriaService = telemetriaService;
        this.objectMapper = objectMapper;
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

                vuelo.setEstado(EstadoVuelo.CANCELADO);
                vueloRepository.save(vuelo);

                redisCacheService.actualizarCargaDisponibleVuelo(vuelo.getId(), 0);

                List<Equipaje> afectados = equipajeRepository.findByVueloActualId(vuelo.getId());
                for (Equipaje eq : afectados) {
                    eq.setEstado(EstadoEquipaje.EN_REPLANIFICACION);
                    eq.setVueloActual(null);
                    equipajeRepository.save(eq);
                }

                EventoCancelacion evento = new EventoCancelacion(
                        UUID.randomUUID(), sesion.getId(), vuelo.getId(), "SIMULACION");
                evento.setCausa("Cancelacion probabilistica en tick");
                evento.setOcurridoEnVirtual(sesion.getDiaHoraVirtual());
                eventoCancelacionRepository.save(evento);

                LoteReplanificacion lote = new LoteReplanificacion(
                        UUID.randomUUID(), evento.getId(), sesion.getId());
                lote.setTotalEquipajes(afectados.size());
                loteReplanificacionRepository.save(lote);

                sesion.setVuelosCancelados(
                        (sesion.getVuelosCancelados() != null ? sesion.getVuelosCancelados() : 0) + 1);
                sesion.setMaletasReplanificadas(
                        (sesion.getMaletasReplanificadas() != null ? sesion.getMaletasReplanificadas() : 0)
                                + afectados.size());
                sesionRepository.save(sesion);

                eventPublisher.publishEvent(
                        new VueloCanceladoEvent(vuelo.getId(), now, "Cancelacion probabilistica en tick"));
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
        } catch (JsonProcessingException e) {
            log.error("Error building metrics JSON for session {}: {}", sesion.getId(), e.getMessage());
            return "{}";
        }
    }
}
