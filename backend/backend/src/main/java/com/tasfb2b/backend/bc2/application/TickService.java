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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
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
    private final SesionReadinessManager readinessManager;
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
                        SesionReadinessManager readinessManager) {
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
        this.readinessManager = readinessManager;
        this.k = 120.0; // fallback; el valor real viene de sesion.getK()
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
        if (!readinessManager.estaLista(sesion.getId())) {
            return;
        }

        OffsetDateTime now = OffsetDateTime.now();

        avanzarRelojVirtual(sesion);

        // Auto-finalizar al completar 5 días virtuales
        if (debeFinalizarPorTiempo(sesion)) {
            finalizarSesionPorTiempo(sesion, now);
            return;
        }

        clonarParaNuevoDia(sesion);
        registrarPuntoSla(sesion);
        procesarVuelosSalida(sesion);
        procesarVuelosLlegada(sesion);
        evaluarCancelaciones(sesion, now);
        actualizarSla(sesion);

        // Un solo save al final del tick
        sesionRepository.save(sesion);

        // Cargar datos UNA SOLA VEZ para telemetria
        List<NodoLogistico> nodos = nodoRepository.findAllByOrderByCodigoIataAsc();
        List<Vuelo> vuelos = vueloRepository.findByEstadoInAndEsPlantilla(
                List.of(EstadoVuelo.PROGRAMADO, EstadoVuelo.EN_RUTA), false);

        boolean colapso = detectarColapso(sesion, now, nodos);
        escribirMetricas(sesion, now);
        telemetriaService.emitirTelemetria(sesion, nodos, vuelos);

        if (colapso) {
            detenerSesionPorColapso(sesion, now);
        }
    }

    private boolean debeFinalizarPorTiempo(SesionEjecucion sesion) {
        if (sesion.getDiaHoraVirtual() == null || sesion.getFechaInicioVirtual() == null) return false;
        LocalDate fechaFin = sesion.getFechaInicioVirtual().plusDays(5);
        return !sesion.getDiaHoraVirtual().toLocalDate().isBefore(fechaFin);
    }

    private void finalizarSesionPorTiempo(SesionEjecucion sesion, OffsetDateTime now) {
        log.info("Sesion {} alcanzó 5 dias virtuales. Finalizando automaticamente.", sesion.getId());
        sesion.setEstado(EstadoSesion.FINALIZADA);
        sesion.setFechaFinReal(now);
        sesionRepository.save(sesion);

        ultimaHoraRegistrada.remove(sesion.getId());
        ultimaFechaClonada.remove(sesion.getId());
        readinessManager.eliminar(sesion.getId());

        try {
            redisCacheService.setEstadoSesion(sesion.getId(), "FINALIZADA");
            redisCacheService.eliminarMetricasSesion(sesion.getId());
        } catch (Exception e) {
            log.warn("Redis no disponible al finalizar sesion {}: {}", sesion.getId(), e.getMessage());
        }

        eventPublisher.publishEvent(new SesionFinalizada(sesion.getId(), "FINALIZADA", now));
        telemetriaService.emitirTelemetria(sesion);
    }

    private void avanzarRelojVirtual(SesionEjecucion sesion) {
        double kEfectivo = sesion.getK() != null ? sesion.getK() : k;
        long virtualMinutos = (long) ((TICK_INTERVAL_MS / 1000.0) * kEfectivo / 60);

        if (sesion.getDiaHoraVirtual() == null) {
            OffsetDateTime inicio = OffsetDateTime.of(
                    sesion.getFechaInicioVirtual(),
                    sesion.getHoraInicioVirtual(),
                    ZoneOffset.UTC);
            sesion.setDiaHoraVirtual(inicio);
        } else {
            sesion.setDiaHoraVirtual(sesion.getDiaHoraVirtual().plusMinutes(virtualMinutos));
        }
        sesion.setSegundosRealesTranscurridos(
                (sesion.getSegundosRealesTranscurridos() != null ? sesion.getSegundosRealesTranscurridos() : 0)
                        + (int) (TICK_INTERVAL_MS / 1000));
        // Save se hace al final del tick en procesarTick
    }

    private void clonarParaNuevoDia(SesionEjecucion sesion) {
        if (sesion.getTipo() != TipoSesion.SIMULADA) return;
        if (sesion.getDiaHoraVirtual() == null) return;

        LocalDate fechaActual = sesion.getDiaHoraVirtual().toLocalDate();
        LocalDate ultima = ultimaFechaClonada.get(sesion.getId());
        if (fechaActual.equals(ultima)) return;

        // Si ya existen instancias para esta fecha (ej. preparacion las clonó), marcar y salir
        if (vueloService.existenInstanciasParaFecha(fechaActual)) {
            ultimaFechaClonada.put(sesion.getId(), fechaActual);
            return;
        }

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
            // Si falló por duplicado, los vuelos ya existen: marcar para no reintentar
            ultimaFechaClonada.put(sesion.getId(), fechaActual);
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

        if (saliendo.isEmpty()) return;

        List<Vuelo> vuelosActualizar = new ArrayList<>();
        List<SegmentoPlan> segmentosActualizar = new ArrayList<>();
        List<Equipaje> equipajesActualizar = new ArrayList<>();
        Map<UUID, Integer> nodosCarga = new HashMap<>();

        for (Vuelo vuelo : saliendo) {
            vuelo.setEstado(EstadoVuelo.EN_RUTA);
            vuelosActualizar.add(vuelo);

            NodoLogistico origen = vuelo.getOrigen();

            List<SegmentoPlan> segmentos = segmentoPlanRepository.findByVueloIdAndEstado(
                    vuelo.getId(), EstadoSegmento.PENDIENTE);
            for (SegmentoPlan seg : segmentos) {
                seg.setEstado(EstadoSegmento.EN_CURSO);
                segmentosActualizar.add(seg);

                if (seg.getPlanViaje() != null && seg.getPlanViaje().getEquipaje() != null) {
                    Equipaje eq = seg.getPlanViaje().getEquipaje();
                    eq.setEstado(EstadoEquipaje.EN_VUELO);
                    eq.setVueloActual(vuelo);
                    equipajesActualizar.add(eq);
                    int cantidad = eq.getCantidad() != null ? eq.getCantidad() : 1;
                    nodosCarga.merge(origen.getId(), cantidad, Integer::sum);
                }
            }
        }

        vueloRepository.saveAll(vuelosActualizar);
        segmentoPlanRepository.saveAll(segmentosActualizar);
        equipajeRepository.saveAll(equipajesActualizar);

        for (Map.Entry<UUID, Integer> entry : nodosCarga.entrySet()) {
            nodoRepository.findById(entry.getKey()).ifPresent(nodo -> {
                nodo.setOcupacionActual(Math.max(0, nodo.getOcupacionActual() - entry.getValue()));
                nodoRepository.save(nodo);
            });
        }
    }

    private void procesarVuelosLlegada(SesionEjecucion sesion) {
        OffsetDateTime virtual = sesion.getDiaHoraVirtual();
        List<Vuelo> llegando = vueloRepository.findByEstadoAndEsPlantillaAndHoraLlegadaLessThanEqual(
                EstadoVuelo.EN_RUTA, false, virtual);

        if (llegando.isEmpty()) return;

        List<Vuelo> vuelosActualizar = new ArrayList<>();
        List<SegmentoPlan> segmentosActualizar = new ArrayList<>();
        List<Equipaje> equipajesActualizar = new ArrayList<>();
        Map<UUID, Integer> nodosCarga = new HashMap<>();

        for (Vuelo vuelo : llegando) {
            vuelo.setEstado(EstadoVuelo.COMPLETADO);
            vuelosActualizar.add(vuelo);

            NodoLogistico destino = vuelo.getDestino();

            List<SegmentoPlan> segmentos = segmentoPlanRepository.findByVueloIdAndEstado(
                    vuelo.getId(), EstadoSegmento.EN_CURSO);
            for (SegmentoPlan seg : segmentos) {
                seg.setEstado(EstadoSegmento.COMPLETADO);
                segmentosActualizar.add(seg);

                if (seg.getPlanViaje() != null && seg.getPlanViaje().getEquipaje() != null) {
                    Equipaje eq = seg.getPlanViaje().getEquipaje();
                    int cantidad = eq.getCantidad() != null ? eq.getCantidad() : 1;

                    // Último segmento = no quedan segmentos de mayor orden sin completar
                    boolean esUltimoSegmento = seg.getPlanViaje().getSegmentos().stream()
                            .noneMatch(s -> s.getOrden() > seg.getOrden()
                                    && s.getEstado() != EstadoSegmento.COMPLETADO);

                    if (esUltimoSegmento) {
                        eq.setEstado(EstadoEquipaje.ENTREGADO);
                        eq.setVueloActual(null);
                    } else {
                        eq.setEstado(EstadoEquipaje.EN_ALMACEN);
                        nodosCarga.merge(destino.getId(), cantidad, Integer::sum);
                    }
                    equipajesActualizar.add(eq);
                }
            }
        }

        vueloRepository.saveAll(vuelosActualizar);
        segmentoPlanRepository.saveAll(segmentosActualizar);
        equipajeRepository.saveAll(equipajesActualizar);

        for (Map.Entry<UUID, Integer> entry : nodosCarga.entrySet()) {
            nodoRepository.findById(entry.getKey()).ifPresent(nodo -> {
                nodo.setOcupacionActual(nodo.getOcupacionActual() + entry.getValue());
                nodoRepository.save(nodo);
            });
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
        // Save se hace al final del tick en procesarTick
    }

    private boolean detectarColapso(SesionEjecucion sesion, OffsetDateTime now, List<NodoLogistico> nodos) {
        BigDecimal rojoMax = sesion.getAlmacenRojoMax();
        if (rojoMax == null) return false;

        for (NodoLogistico nodo : nodos) {
            double pct = nodo.getOcupacionPorcentaje();
            if (pct > rojoMax.doubleValue()) {
                log.warn("COLAPSO en sesion {}: nodo {} ocupacion {}% supera umbral rojo {}%",
                        sesion.getId(), nodo.getCodigoIata(), pct, rojoMax);

                sesion.setEstado(EstadoSesion.COLAPSADA);
                sesion.setFechaFinReal(now);
                sesionRepository.save(sesion);

                readinessManager.eliminar(sesion.getId());
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
            root.put("fecha_inicio_real", sesion.getFechaInicioReal() != null
                    ? sesion.getFechaInicioReal().toString() : null);
            root.put("timestamp", now.toString());
            return objectMapper.writeValueAsString(root);
        } catch (JsonProcessingException e) {
            log.error("Error building metrics JSON for session {}: {}", sesion.getId(), e.getMessage());
            return "{}";
        }
    }
}
