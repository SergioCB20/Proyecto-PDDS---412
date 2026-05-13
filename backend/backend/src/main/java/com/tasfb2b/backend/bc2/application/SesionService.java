package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc2.domain.*;
import com.tasfb2b.backend.bc2.infrastructure.SesionRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
public class SesionService {

    private final SesionRepository sesionRepository;

    public SesionService(SesionRepository sesionRepository) {
        this.sesionRepository = sesionRepository;
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

        return new SesionEstadoResponse(sesion.getEstado().name());
    }

    public SesionEstadoResponse detenerSesion(UUID id) {
        SesionEjecucion sesion = sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));

        sesion.setEstado(EstadoSesion.FINALIZADA);
        sesion.setFechaFinReal(OffsetDateTime.now());
        sesionRepository.save(sesion);

        return new SesionEstadoResponse(sesion.getEstado().name());
    }

    public MetricasSesionResponse obtenerMetricas(UUID id) {
        SesionEjecucion sesion = sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));

        // Datos dummy por ahora - luego se conectará con TickService real
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