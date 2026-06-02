package com.tasfb2b.backend.bc2.application;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import com.tasfb2b.backend.bc2.domain.*;
import com.tasfb2b.backend.bc2.infrastructure.EquipajeSimuladoRepository;
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
import java.util.UUID;

@Service
public class SesionService {

    private static final Logger log = LoggerFactory.getLogger(SesionService.class);

    private final SesionRepository sesionRepository;
    private final RedisCacheService redisCacheService;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final CsvBaggageLoader csvBaggageLoader;
    private final EquipajeSimuladoRepository equipajeSimuladoRepository;

    public SesionService(SesionRepository sesionRepository,
                         RedisCacheService redisCacheService,
                         ObjectMapper objectMapper,
                         ApplicationEventPublisher eventPublisher,
                         CsvBaggageLoader csvBaggageLoader,
                         EquipajeSimuladoRepository equipajeSimuladoRepository) {
        this.sesionRepository = sesionRepository;
        this.redisCacheService = redisCacheService;
        this.objectMapper = objectMapper;
        this.eventPublisher = eventPublisher;
        this.csvBaggageLoader = csvBaggageLoader;
        this.equipajeSimuladoRepository = equipajeSimuladoRepository;
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
        redisCacheService.setEstadoSesion(sesion.getId(), sesion.getEstado().name());

        if (sesion.getTipo() == TipoSesion.SIMULADA) {
            csvBaggageLoader.copiarASesion(sesion.getId(), request.fecha_inicio_virtual(), request.hora_inicio_virtual());
        }

        return new SesionResponse(sesion.getId(), sesion.getTipo().name(), sesion.getEstado().name());
    }

    public SesionIniciarResponse iniciarSesion(UUID id) {
        SesionEjecucion sesion = sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));

        if (sesion.getEstado() != EstadoSesion.CONFIGURADA && sesion.getEstado() != EstadoSesion.PAUSADA) {
            throw new IllegalStateException("No se puede iniciar la sesion en estado: " + sesion.getEstado());
        }

        sesion.setEstado(EstadoSesion.EN_CURSO);
        sesion.setFechaInicioReal(OffsetDateTime.now());
        sesionRepository.save(sesion);

        redisCacheService.setEstadoSesion(sesion.getId(), "EN_CURSO");

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

        redisCacheService.setEstadoSesion(sesion.getId(), "PAUSADA");

        return new SesionEstadoResponse(sesion.getEstado().name());
    }

    public SesionEstadoResponse detenerSesion(UUID id) {
        SesionEjecucion sesion = sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));

        sesion.setEstado(EstadoSesion.FINALIZADA);
        sesion.setFechaFinReal(OffsetDateTime.now());
        sesionRepository.save(sesion);

        redisCacheService.setEstadoSesion(sesion.getId(), "FINALIZADA");
        redisCacheService.eliminarMetricasSesion(sesion.getId());

        eventPublisher.publishEvent(new SesionFinalizada(
                sesion.getId(), "FINALIZADA", OffsetDateTime.now()));

        if (sesion.getTipo() == TipoSesion.SIMULADA) {
            limpiarEquipajesSimulados(sesion.getId());
        }

        return new SesionEstadoResponse(sesion.getEstado().name());
    }

    @Transactional
    public void limpiarEquipajesSimulados(UUID sesionId) {
        equipajeSimuladoRepository.eliminarPorSesionId(sesionId);
        log.info("Cleanup equipajes_simulados completado para sesion {}", sesionId);
    }

    public MetricasSesionResponse obtenerMetricas(UUID id) {
        try {
            String cached = redisCacheService.getMetricasSesion(id);
            if (cached != null) {
                var node = objectMapper.readTree(cached);
                return new MetricasSesionResponse(
                    UUID.fromString(node.get("sesion_id").asText()),
                    node.get("estado").asText(),
                    OffsetDateTime.parse(node.get("dia_hora_virtual").asText()),
                    node.get("segundos_reales_transcurridos").asInt(),
                    new BigDecimal(node.get("sla_acumulado_pct").asDouble()),
                    node.get("vuelos_cancelados").asInt(),
                    node.get("maletas_replanificadas").asInt()
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
            OffsetDateTime.now(),
            sesion.getSegundosRealesTranscurridos() != null ? sesion.getSegundosRealesTranscurridos() : 0,
            sesion.getSlaAcumuladoPct() != null ? sesion.getSlaAcumuladoPct() : new BigDecimal("100"),
            sesion.getVuelosCancelados() != null ? sesion.getVuelosCancelados() : 0,
            sesion.getMaletasReplanificadas() != null ? sesion.getMaletasReplanificadas() : 0
        );
    }

    public SesionEjecucion obtenerSesion(UUID id) {
        return sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));
    }
}