package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.domain.EstadoEquipaje;
import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import com.tasfb2b.backend.shared.events.VueloCanceladoEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class CancelacionService {

    private final VueloRepository vueloRepository;
    private final EquipajeRepository equipajeRepository;
    private final ApplicationEventPublisher eventPublisher;

    public CancelacionService(VueloRepository vueloRepository, EquipajeRepository equipajeRepository, ApplicationEventPublisher eventPublisher) {
        this.vueloRepository = vueloRepository;
        this.equipajeRepository = equipajeRepository;
        this.eventPublisher = eventPublisher;
    }

    public record CancelacionRequest(UUID vuelo_id, String causa) {}

    public record CancelacionResponse(
            UUID vuelo_id,
            String estado_nuevo,
            int equipajes_afectados,
            UUID lote_replanificacion_id
    ) {}

    @Transactional
    public CancelacionResponse cancelar(CancelacionRequest request) {
        Vuelo vuelo = vueloRepository.findById(request.vuelo_id())
                .orElseThrow(() -> new VueloNoEncontradoException("Vuelo no encontrado: " + request.vuelo_id()));

        if (vuelo.getEstado() != EstadoVuelo.PROGRAMADO && vuelo.getEstado() != EstadoVuelo.EN_RUTA) {
            throw new CancelacionInvalidaException("No se puede cancelar vuelo en estado: " + vuelo.getEstado());
        }

        int afectados = (int) equipajeRepository.findAll().stream()
                .filter(e -> e.getVueloActual() != null && e.getVueloActual().getId().equals(vuelo.getId()))
                .count();

        vuelo.setEstado(EstadoVuelo.CANCELADO);
        vueloRepository.save(vuelo);

        eventPublisher.publishEvent(new VueloCanceladoEvent(vuelo.getId(), OffsetDateTime.now(), request.causa()));

        for (Equipaje equipaje : equipajeRepository.findAll()) {
            if (equipaje.getVueloActual() != null && equipaje.getVueloActual().getId().equals(vuelo.getId())) {
                equipaje.setEstado(EstadoEquipaje.EN_REPLANIFICACION);
                equipajeRepository.save(equipaje);
            }
        }

        UUID loteId = UUID.randomUUID();

        return new CancelacionResponse(
                vuelo.getId(),
                "CANCELADO",
                afectados,
                loteId
        );
    }

    public static class VueloNoEncontradoException extends RuntimeException {
        public VueloNoEncontradoException(String msg) { super(msg); }
    }

    public static class CancelacionInvalidaException extends RuntimeException {
        public CancelacionInvalidaException(String msg) { super(msg); }
    }
}