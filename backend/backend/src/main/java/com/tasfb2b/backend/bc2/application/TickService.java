package com.tasfb2b.backend.bc2.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tasfb2b.backend.bc1.application.VueloService;
import com.tasfb2b.backend.bc1.domain.*;
import com.tasfb2b.backend.bc1.infrastructure.*;
import com.tasfb2b.backend.bc2.domain.*;
import com.tasfb2b.backend.bc2.infrastructure.PuntoSLARepository;
import com.tasfb2b.backend.bc2.infrastructure.ReporteSesionRepository;
import com.tasfb2b.backend.bc2.infrastructure.SesionRepository;
import com.tasfb2b.backend.shared.events.SesionFinalizada;
import com.tasfb2b.backend.shared.infrastructure.RedisCacheService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TickService {

    private static final Logger log = LoggerFactory.getLogger(TickService.class);
    private static final long TICK_INTERVAL_MS = 5000;
    private static final Random RANDOM = new Random();

    private final SesionRepository sesionRepository;
    private final VueloRepository vueloRepository;
    private final EquipajeRepository equipajeRepository;
    private final SegmentoPlanRepository segmentoPlanRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final RedisCacheService redisCacheService;
    private final TelemetriaService telemetriaService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final VueloService vueloService;
    private final ReplanificacionService replanificacionService;
    private final ApplicationEventPublisher eventPublisher;
    private final ReporteSesionRepository reporteSesionRepository;
    private final PuntoSLARepository puntoSLARepository;
    private final PlanViajeRepository planViajeRepository;
    private final double k;

    private final ConcurrentHashMap<UUID, Integer> ultimaHoraRegistrada = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<UUID, LocalDate> ultimaFechaClonada = new ConcurrentHashMap<>();

    public TickService(SesionRepository sesionRepository,
                       VueloRepository vueloRepository,
                       EquipajeRepository equipajeRepository,
                       SegmentoPlanRepository segmentoPlanRepository,
                       NodoLogisticoRepository nodoRepository,
                       RedisCacheService redisCacheService,
                       TelemetriaService telemetriaService,
                       VueloService vueloService,
                       ReplanificacionService replanificacionService,
                       ApplicationEventPublisher eventPublisher,
                       ReporteSesionRepository reporteSesionRepository,
                       PuntoSLARepository puntoSLARepository,
                       PlanViajeRepository planViajeRepository,
                       @Value("${app.simulacion.k}") double k) {
        this.sesionRepository = sesionRepository;
        this.vueloRepository = vueloRepository;
        this.equipajeRepository = equipajeRepository;
        this.segmentoPlanRepository = segmentoPlanRepository;
        this.nodoRepository = nodoRepository;
        this.redisCacheService = redisCacheService;
        this.telemetriaService = telemetriaService;
        this.vueloService = vueloService;
        this.replanificacionService = replanificacionService;
        this.eventPublisher = eventPublisher;
        this.reporteSesionRepository = reporteSesionRepository;
        this.puntoSLARepository = puntoSLARepository;
        this.planViajeRepository = planViajeRepository;
        this.k = k;
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
        clonarParaNuevoDia(sesion);
        registrarPuntoSla(sesion);
        procesarVuelosSalida(sesion);
        procesarVuelosLlegada(sesion);
        evaluarCancelaciones(sesion, now);
        actualizarSla(sesion);
        boolean colapso = detectarColapso(sesion, now);
        escribirMetricas(sesion, now);
        telemetriaService.emitirTelemetria(sesion);

        if (colapso) {
            detenerSesionPorColapso(sesion, now);
        }
    }

    private void avanzarRelojVirtual(SesionEjecucion sesion) {
        long virtualMinutos = (long) ((TICK_INTERVAL_MS / 1000.0) * k / 60);

        if (sesion.getDiaHoraVirtual() == null) {
            OffsetDateTime inicio = OffsetDateTime.of(
                    sesion.getFechaInicioVirtual(),
                    sesion.getHoraInicioVirtual(),
                    OffsetDateTime.now().getOffset());
            sesion.setDiaHoraVirtual(inicio);
        } else {
            sesion.setDiaHoraVirtual(sesion.getDiaHoraVirtual().plusMinutes(virtualMinutos));
        }
        sesion.setSegundosRealesTranscurridos(
                (sesion.getSegundosRealesTranscurridos() != null ? sesion.getSegundosRealesTranscurridos() : 0)
                        + (int) (TICK_INTERVAL_MS / 1000));
        sesionRepository.save(sesion);
    }

    private void clonarParaNuevoDia(SesionEjecucion sesion) {
        if (sesion.getTipo() != TipoSesion.SIMULADA) return;
        if (sesion.getDiaHoraVirtual() == null) return;

        LocalDate fechaActual = sesion.getDiaHoraVirtual().toLocalDate();
        LocalDate ultima = ultimaFechaClonada.get(sesion.getId());
        if (fechaActual.equals(ultima)) return;

        try {
            int clonadas = vueloService.clonarPlantillas(fechaActual);
            if (clonadas > 0) {
                log.info("Progressive clone: {} vuelos creados para fecha {} en sesion {}",
                        clonadas, fechaActual, sesion.getId());
            }
            ultimaFechaClonada.put(sesion.getId(), fechaActual);
        } catch (Exception e) {
            log.warn("Error en clonado progresivo para sesion {} fecha {}: {}",
                    sesion.getId(), fechaActual, e.getMessage());
        }
    }

    private void registrarPuntoSla(SesionEjecucion sesion) {
        if (sesion.getTipo() != TipoSesion.SIMULADA) return;
        if (sesion.getDiaHoraVirtual() == null) return;

        int horaVirtual = sesion.getDiaHoraVirtual().getHour();
        Integer ultimo = ultimaHoraRegistrada.get(sesion.getId());
        if (ultimo != null && ultimo == horaVirtual) return;

        UUID sesionId = sesion.getId();
        ReporteSesion reporte = reporteSesionRepository.findBySesionId(sesionId).orElse(null);
        if (reporte == null) return;

        PuntoSLA punto = new PuntoSLA(
                UUID.randomUUID(),
                reporte.getId(),
                sesion.getDiaHoraVirtual(),
                sesion.getSlaAcumuladoPct() != null ? sesion.getSlaAcumuladoPct() : BigDecimal.valueOf(100));
        puntoSLARepository.save(punto);

        ultimaHoraRegistrada.put(sesionId, horaVirtual);
        log.debug("PuntoSLA registrado para sesion {}: hora virtual {}, sla={}%",
                sesionId, horaVirtual, punto.getSlaPct());
    }

    private void procesarVuelosSalida(SesionEjecucion sesion) {
        OffsetDateTime virtual = sesion.getDiaHoraVirtual();
        List<Vuelo> saliendo = vueloRepository.findByEstadoAndEsPlantillaAndHoraSalidaLessThanEqual(
                EstadoVuelo.PROGRAMADO, false, virtual);

        for (Vuelo vuelo : saliendo) {
            vuelo.setEstado(EstadoVuelo.EN_RUTA);
            vueloRepository.save(vuelo);

            NodoLogistico origen = vuelo.getOrigen();
            int cargaSaliendo = 0;

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
                    cargaSaliendo += eq.getCantidad() != null ? eq.getCantidad() : 1;
                }
            }

            if (cargaSaliendo > 0) {
                origen.setOcupacionActual(Math.max(0, origen.getOcupacionActual() - cargaSaliendo));
                nodoRepository.save(origen);
            }
        }
    }

    private void procesarVuelosLlegada(SesionEjecucion sesion) {
        OffsetDateTime virtual = sesion.getDiaHoraVirtual();
        List<Vuelo> llegando = vueloRepository.findByEstadoAndEsPlantillaAndHoraLlegadaLessThanEqual(
                EstadoVuelo.EN_RUTA, false, virtual);

        for (Vuelo vuelo : llegando) {
            vuelo.setEstado(EstadoVuelo.COMPLETADO);
            vueloRepository.save(vuelo);

            NodoLogistico destino = vuelo.getDestino();
            int cargaLlegando = 0;

            List<SegmentoPlan> segmentos = segmentoPlanRepository.findByVueloIdAndEstado(
                    vuelo.getId(), EstadoSegmento.EN_CURSO);
            for (SegmentoPlan seg : segmentos) {
                seg.setEstado(EstadoSegmento.COMPLETADO);
                segmentoPlanRepository.save(seg);

                if (seg.getPlanViaje() != null && seg.getPlanViaje().getEquipaje() != null) {
                    Equipaje eq = seg.getPlanViaje().getEquipaje();
                    int cantidad = eq.getCantidad() != null ? eq.getCantidad() : 1;

                    boolean esUltimoSegmento = seg.getPlanViaje().getSegmentos().stream()
                            .noneMatch(s -> s.getOrden() > seg.getOrden()
                                    && s.getEstado() == EstadoSegmento.PENDIENTE);

                    if (esUltimoSegmento) {
                        eq.setEstado(EstadoEquipaje.ENTREGADO);
                        eq.setVueloActual(null);
                    } else {
                        eq.setEstado(EstadoEquipaje.EN_ALMACEN);
                        cargaLlegando += cantidad;
                    }
                    equipajeRepository.save(eq);
                }
            }

            if (cargaLlegando > 0) {
                destino.setOcupacionActual(destino.getOcupacionActual() + cargaLlegando);
                nodoRepository.save(destino);
            }
        }
    }

    private void evaluarCancelaciones(SesionEjecucion sesion, OffsetDateTime now) {
        BigDecimal prob = sesion.getProbCancelacion();
        if (prob == null || prob.compareTo(BigDecimal.ZERO) <= 0) return;

        List<Vuelo> programados = vueloRepository.findByEstadoAndEsPlantillaAndHoraSalidaLessThanEqual(
                EstadoVuelo.PROGRAMADO, false, sesion.getDiaHoraVirtual());

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

    private void actualizarSla(SesionEjecucion sesion) {
        List<PlanViaje> planes = planViajeRepository.findBySesionIdWithEquipaje(sesion.getId());
        if (planes.isEmpty()) return;

        long totalEntregados = planes.stream()
                .filter(pv -> pv.getEquipaje() != null
                        && pv.getEquipaje().getEstado() == EstadoEquipaje.ENTREGADO)
                .count();

        double sla = (totalEntregados * 100.0) / planes.size();
        sesion.setSlaAcumuladoPct(BigDecimal.valueOf(sla));
        sesionRepository.save(sesion);
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
        } catch (JsonProcessingException e) {
            log.error("Error building metrics JSON for session {}: {}", sesion.getId(), e.getMessage());
            return "{}";
        }
    }
}
