package com.tasfb2b.backend.bc2.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tasfb2b.backend.bc1.application.VueloService;
import com.tasfb2b.backend.bc2.domain.*;
import com.tasfb2b.backend.bc2.infrastructure.PuntoSLARepository;
import com.tasfb2b.backend.bc2.infrastructure.ReporteSesionRepository;
import com.tasfb2b.backend.bc2.infrastructure.SesionRepository;
import com.tasfb2b.backend.shared.events.SesionFinalizada;
import com.tasfb2b.backend.shared.infrastructure.RedisCacheService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class SesionService {

    private static final Logger log = LoggerFactory.getLogger(SesionService.class);

    private final SesionRepository sesionRepository;
    private final VueloService vueloService;
    private final RedisCacheService redisCacheService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ApplicationEventPublisher eventPublisher;
    private final ReporteSesionRepository reporteSesionRepository;
    private final PuntoSLARepository puntoSLARepository;

    public SesionService(SesionRepository sesionRepository,
                         VueloService vueloService,
                         RedisCacheService redisCacheService,
                         ApplicationEventPublisher eventPublisher,
                         ReporteSesionRepository reporteSesionRepository,
                         PuntoSLARepository puntoSLARepository) {
        this.sesionRepository = sesionRepository;
        this.vueloService = vueloService;
        this.redisCacheService = redisCacheService;
        this.eventPublisher = eventPublisher;
        this.reporteSesionRepository = reporteSesionRepository;
        this.puntoSLARepository = puntoSLARepository;
    }

    public SesionResponse crearSesion(CrearSesionRequest request) {
        LocalDate fecha = LocalDate.parse(request.fecha_inicio_virtual());
        LocalTime hora = LocalTime.parse(request.hora_inicio_virtual());

        SesionEjecucion sesion = new SesionEjecucion(
            UUID.randomUUID(),
            TipoSesion.valueOf(request.tipo()),
            fecha,
            hora
        );

        if (request.prob_cancelacion() != null) {
            sesion.setProbCancelacion(request.prob_cancelacion());
        }

        if (request.tipo_simulacion() != null) {
            sesion.setTipoSimulacion(TipoSimulacion.valueOf(request.tipo_simulacion()));
        }
        if (request.ventana_horas() != null) {
            sesion.setVentanaHoras(request.ventana_horas());
        }
        if (request.duracion_dias() != null) {
            sesion.setDuracionDias(request.duracion_dias());
        }

        if (request.umbrales_almacen() != null) {
            var u = request.umbrales_almacen();
            sesion.setAlmacenVerdeMin(u.verde_min() != null ? u.verde_min() : BigDecimal.ZERO);
            sesion.setAlmacenVerdeMax(u.verde_max() != null ? u.verde_max() : new BigDecimal("70"));
            sesion.setAlmacenAmbarMin(u.ambar_min() != null ? u.ambar_min() : new BigDecimal("70"));
            sesion.setAlmacenAmbarMax(u.ambar_max() != null ? u.ambar_max() : new BigDecimal("90"));
        }

        if (request.umbrales_vuelo() != null) {
            var u = request.umbrales_vuelo();
            sesion.setVueloVerdeMin(u.verde_min() != null ? u.verde_min() : BigDecimal.ZERO);
            sesion.setVueloVerdeMax(u.verde_max() != null ? u.verde_max() : new BigDecimal("70"));
            sesion.setVueloAmbarMin(u.ambar_min() != null ? u.ambar_min() : new BigDecimal("70"));
            sesion.setVueloAmbarMax(u.ambar_max() != null ? u.ambar_max() : new BigDecimal("90"));
        }

        sesionRepository.save(sesion);

        try {
            redisCacheService.setEstadoSesion(sesion.getId(), sesion.getEstado().name());
        } catch (Exception e) {
            log.warn("Redis no disponible al crear sesion {}: {}", sesion.getId(), e.getMessage());
        }

        return new SesionResponse(sesion.getId(), sesion.getTipo().name(), sesion.getEstado().name());
    }

    public SesionIniciarResponse iniciarSesion(UUID id) {
        SesionEjecucion sesion = sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));

        if (sesion.getEstado() != EstadoSesion.CONFIGURADA && sesion.getEstado() != EstadoSesion.PAUSADA) {
            throw new IllegalStateException("No se puede iniciar la sesion en estado: " + sesion.getEstado());
        }

        long enCursoCount = sesionRepository.findByEstado(EstadoSesion.EN_CURSO).stream()
            .filter(s -> !s.getId().equals(id))
            .count();
        if (enCursoCount > 0) {
            throw new IllegalStateException("Ya existe una sesion EN_CURSO. Detenela antes de iniciar otra.");
        }

        if (sesion.getTipo() == TipoSesion.SIMULADA) {
            prepararInstanciasSimulacion(sesion);
        }

        return activarSesion(sesion);
    }

    @Transactional
    public void prepararInstanciasSimulacion(SesionEjecucion sesion) {
        UUID id = sesion.getId();
        LocalDate desde = sesion.getFechaInicioVirtual();
        LocalDate hasta = desde.plusDays(sesion.getDuracionDias() != null ? sesion.getDuracionDias() : 30);

        log.info("Limpiando instancias previas para sesion {} entre {} y {}", id, desde, hasta);
        try {
            vueloService.eliminarInstanciasPorFecha(desde, hasta);
        } catch (Exception e) {
            log.warn("Error limpiando instancias para sesion {}: {}", id, e.getMessage());
        }

        log.info("Clonando plantillas para sesion {} en fecha {}", id, sesion.getFechaInicioVirtual());
        try {
            int clonadas = vueloService.clonarPlantillas(sesion.getFechaInicioVirtual());
            log.info("Dia {}: {} vuelos clonados", sesion.getFechaInicioVirtual(), clonadas);
        } catch (Exception e) {
            log.warn("No se pudieron clonar plantillas para sesion {}: {}", id, e.getMessage());
        }

        ReporteSesion reporte = new ReporteSesion(UUID.randomUUID(), id);
        reporte.setSlaIncumplidoPct(BigDecimal.ZERO);
        reporte.setTotalReplanificadas(0);
        reporteSesionRepository.save(reporte);
        log.info("ReporteSesion pre-creado {} para sesion {}", reporte.getId(), id);
    }

    @Transactional
    public SesionIniciarResponse activarSesion(SesionEjecucion sesion) {
        sesion.setEstado(EstadoSesion.EN_CURSO);
        sesion.setFechaInicioReal(OffsetDateTime.now());
        sesionRepository.save(sesion);

        try {
            redisCacheService.setEstadoSesion(sesion.getId(), "EN_CURSO");
        } catch (Exception e) {
            log.warn("Redis no disponible al iniciar sesion {}: {}", sesion.getId(), e.getMessage());
        }

        return new SesionIniciarResponse(sesion.getId(), sesion.getEstado().name(), sesion.getFechaInicioReal());
    }

    public SesionEstadoResponse pausarSesion(UUID id) {
        SesionEjecucion sesion = sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));

        if (sesion.getEstado() != EstadoSesion.EN_CURSO) {
            throw new IllegalStateException("Solo se puede pausar una sesion EN_CURSO");
        }

        sesion.setEstado(EstadoSesion.PAUSADA);
        sesionRepository.save(sesion);

        try {
            redisCacheService.setEstadoSesion(sesion.getId(), "PAUSADA");
        } catch (Exception e) {
            log.warn("Redis no disponible al pausar sesion {}: {}", sesion.getId(), e.getMessage());
        }

        return new SesionEstadoResponse(sesion.getEstado().name());
    }

    @Transactional
    public SesionEstadoResponse detenerSesion(UUID id) {
        SesionEjecucion sesion = sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));

        sesion.setEstado(EstadoSesion.FINALIZADA);
        sesion.setFechaFinReal(OffsetDateTime.now());
        sesionRepository.save(sesion);

        if (sesion.getTipo() == TipoSesion.SIMULADA) {
            LocalDate desde = sesion.getFechaInicioVirtual();
            LocalDate hasta = desde.plusDays(sesion.getDuracionDias() != null ? sesion.getDuracionDias() : 30);

            log.info("Limpiando instancias de simulacion para sesion {} entre {} y {}", id, desde, hasta);
            try {
                vueloService.eliminarInstanciasPorFecha(desde, hasta);
            } catch (Exception e) {
                log.warn("Error limpiando instancias al detener sesion {}: {}", id, e.getMessage());
            }
        }

        try {
            redisCacheService.setEstadoSesion(sesion.getId(), "FINALIZADA");
            redisCacheService.eliminarMetricasSesion(sesion.getId());
        } catch (Exception e) {
            log.warn("Redis no disponible al detener sesion {}: {}", sesion.getId(), e.getMessage());
        }

        eventPublisher.publishEvent(new SesionFinalizada(
                sesion.getId(), "FINALIZADA", OffsetDateTime.now()));

        return new SesionEstadoResponse(sesion.getEstado().name());
    }

    public MetricasSesionResponse obtenerMetricas(UUID id) {
        try {
            String cached = redisCacheService.getMetricasSesion(id);
            if (cached != null) {
                var node = objectMapper.readTree(cached);
                OffsetDateTime fechaInicioReal = null;
                if (node.has("fecha_inicio_real") && !node.get("fecha_inicio_real").isNull()) {
                    fechaInicioReal = OffsetDateTime.parse(node.get("fecha_inicio_real").asText());
                }
                return new MetricasSesionResponse(
                    UUID.fromString(node.get("sesion_id").asText()),
                    node.get("estado").asText(),
                    OffsetDateTime.parse(node.get("dia_hora_virtual").asText()),
                    node.get("segundos_reales_transcurridos").asInt(),
                    new BigDecimal(node.get("sla_acumulado_pct").asDouble()),
                    node.get("vuelos_cancelados").asInt(),
                    node.get("maletas_replanificadas").asInt(),
                    fechaInicioReal
                );
            }
        } catch (Exception e) {
            log.warn("Redis no disponible para metricas de sesion {}: {}", id, e.getMessage());
        }

        SesionEjecucion sesion = sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));

        return new MetricasSesionResponse(
            sesion.getId(),
            sesion.getEstado().name(),
            sesion.getDiaHoraVirtual() != null ? sesion.getDiaHoraVirtual() : OffsetDateTime.now(),
            sesion.getSegundosRealesTranscurridos() != null ? sesion.getSegundosRealesTranscurridos() : 0,
            sesion.getSlaAcumuladoPct() != null ? sesion.getSlaAcumuladoPct() : new BigDecimal("100"),
            sesion.getVuelosCancelados() != null ? sesion.getVuelosCancelados() : 0,
            sesion.getMaletasReplanificadas() != null ? sesion.getMaletasReplanificadas() : 0,
            sesion.getFechaInicioReal()
        );
    }

    public SesionEjecucion obtenerSesion(UUID id) {
        return sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));
    }

    public List<SesionListaResponse> listarSesiones(String estado) {
        List<SesionEjecucion> sesiones;
        if (estado != null && !estado.isBlank()) {
            try {
                sesiones = sesionRepository.findByEstado(EstadoSesion.valueOf(estado.toUpperCase()));
            } catch (IllegalArgumentException e) {
                log.warn("Estado de sesion invalido: {}", estado);
                sesiones = List.of();
            }
        } else {
            sesiones = sesionRepository.findAll();
        }
        return sesiones.stream()
            .map(s -> new SesionListaResponse(
                s.getId(),
                s.getTipo().name(),
                s.getTipoSimulacion() != null ? s.getTipoSimulacion().name() : "VENTANA_FIJA",
                s.getEstado().name(),
                s.getFechaInicioVirtual().toString(),
                s.getCreatedAt().toString()
            ))
            .toList();
    }
}