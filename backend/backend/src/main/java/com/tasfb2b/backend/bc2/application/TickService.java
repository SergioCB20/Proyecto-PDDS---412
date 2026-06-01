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
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TickService {

    private static final Logger log = LoggerFactory.getLogger(TickService.class);
    private static final long TICK_INTERVAL_MS = 5000;
    private static final double VIRTUAL_SECONDS_PER_REAL_SECOND = 120.0;
    private static final long VIRTUAL_MINUTES_PER_TICK = (long) ((TICK_INTERVAL_MS / 1000.0) * VIRTUAL_SECONDS_PER_REAL_SECOND / 60);
    private static final Random RANDOM = new Random();
    private static final LocalDate FECHA_BASE_VUELOS = LocalDate.of(2026, 1, 15);
    private static final long DIAS_SIMULACION = 5;

    private final Map<UUID, LocalDate> ultimoDiaGeneradoPorSesion = new HashMap<>();

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
    private final SimuladorBaggageFeeder simuladorBaggageFeeder;

    public TickService(SesionRepository sesionRepository,
                       VueloRepository vueloRepository,
                       EquipajeRepository equipajeRepository,
                       SegmentoPlanRepository segmentoPlanRepository,
                       NodoLogisticoRepository nodoRepository,
                       RedisCacheService redisCacheService,
                       TelemetriaService telemetriaService,
                       ObjectMapper objectMapper,
                       ReplanificacionService replanificacionService,
                       ApplicationEventPublisher eventPublisher,
                       SimuladorBaggageFeeder simuladorBaggageFeeder) {
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
        this.simuladorBaggageFeeder = simuladorBaggageFeeder;
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
        generarVuelosSiEsNecesario(sesion);

        if (excedeLimiteTiempo(sesion)) {
            detenerSesionPorTiempo(sesion, now);
            return;
        }

        simuladorBaggageFeeder.alimentarMotor(sesion.getId(), sesion.getDiaHoraVirtual());
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

    private void generarVuelosSiEsNecesario(SesionEjecucion sesion) {
        if (sesion.getDiaHoraVirtual() == null) return;

        LocalDate fechaActual = sesion.getDiaHoraVirtual().toLocalDate();

        if (fechaActual.equals(ultimoDiaGeneradoPorSesion.get(sesion.getId()))) return;

        OffsetDateTime inicioBase = FECHA_BASE_VUELOS.atStartOfDay(ZoneOffset.UTC).toOffsetDateTime();
        OffsetDateTime finBase = FECHA_BASE_VUELOS.plusDays(1).atStartOfDay(ZoneOffset.UTC).toOffsetDateTime();

        List<Vuelo> templates = vueloRepository.findByHoraSalidaBetweenAndEsPlantilla(
                inicioBase, finBase, true);
        if (templates.isEmpty()) return;

        List<Vuelo> clones = templates.stream().map(t -> {
            Vuelo v = new Vuelo();
            v.setId(UUID.randomUUID());
            v.setPlanVuelos(t.getPlanVuelos());
            v.setCodigoVuelo(t.getCodigoVuelo());
            v.setEstado(EstadoVuelo.PROGRAMADO);
            v.setEsPlantilla(false);
            v.setOrigen(t.getOrigen());
            v.setDestino(t.getDestino());
            v.setOrigenLat(t.getOrigenLat());
            v.setOrigenLon(t.getOrigenLon());
            v.setDestinoLat(t.getDestinoLat());
            v.setDestinoLon(t.getDestinoLon());
            v.setCapacidadCarga(t.getCapacidadCarga());
            v.setCargaDisponible(t.getCapacidadCarga());
            v.setHoraSalida(OffsetDateTime.of(fechaActual, t.getHoraSalida().toLocalTime(), ZoneOffset.UTC));
            v.setHoraLlegada(OffsetDateTime.of(fechaActual, t.getHoraLlegada().toLocalTime(), ZoneOffset.UTC));
            return v;
        }).collect(Collectors.toList());
        vueloRepository.saveAll(clones);

        ultimoDiaGeneradoPorSesion.put(sesion.getId(), fechaActual);
        log.info("Generados {} vuelos para el dia {}", templates.size(), fechaActual);
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
        List<Vuelo> saliendo = vueloRepository.findByEstadoAndHoraSalidaLessThanEqualAndEsPlantilla(
                EstadoVuelo.PROGRAMADO, virtual, false);

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
        List<Vuelo> llegando = vueloRepository.findByEstadoAndHoraLlegadaLessThanEqualAndEsPlantilla(
                EstadoVuelo.EN_RUTA, virtual, false);

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

        List<Vuelo> programados = vueloRepository.findByEstadoAndHoraSalidaLessThanEqualAndEsPlantilla(
                EstadoVuelo.PROGRAMADO, sesion.getDiaHoraVirtual(), false);

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
        ultimoDiaGeneradoPorSesion.remove(sesion.getId());
    }

    private boolean excedeLimiteTiempo(SesionEjecucion sesion) {
        if (sesion.getDiaHoraVirtual() == null) return false;
        OffsetDateTime inicioVirtual = OffsetDateTime.of(
                sesion.getFechaInicioVirtual(),
                sesion.getHoraInicioVirtual(),
                ZoneOffset.UTC);
        OffsetDateTime limite = inicioVirtual.plusDays(DIAS_SIMULACION);
        return sesion.getDiaHoraVirtual().isAfter(limite);
    }

    private void detenerSesionPorTiempo(SesionEjecucion sesion, OffsetDateTime now) {
        log.info("Sesion {} finalizada por tiempo limite ({} dias virtuales)", sesion.getId(), DIAS_SIMULACION);
        sesion.setEstado(EstadoSesion.FINALIZADA);
        sesion.setFechaFinReal(now);
        sesionRepository.save(sesion);

        redisCacheService.setEstadoSesion(sesion.getId(), "FINALIZADA");
        redisCacheService.setMetricasSesion(sesion.getId(), buildMetricasJson(sesion, now, false));

        eventPublisher.publishEvent(new SesionFinalizada(
                sesion.getId(), "FINALIZADA_POR_TIEMPO", now));

        telemetriaService.emitirTelemetria(sesion);

        ultimoDiaGeneradoPorSesion.remove(sesion.getId());
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
