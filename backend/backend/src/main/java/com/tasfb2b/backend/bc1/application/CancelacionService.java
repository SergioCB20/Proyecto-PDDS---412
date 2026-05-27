package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import com.tasfb2b.backend.shared.events.VueloCanceladoEvent;
import com.tasfb2b.backend.shared.infrastructure.RedisCacheService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class CancelacionService {

    private final VueloRepository vueloRepository;
    private final EquipajeRepository equipajeRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final RedisCacheService redisCacheService;

    public CancelacionService(VueloRepository vueloRepository, EquipajeRepository equipajeRepository,
                              NodoLogisticoRepository nodoRepository, ApplicationEventPublisher eventPublisher,
                              RedisCacheService redisCacheService) {
        this.vueloRepository = vueloRepository;
        this.equipajeRepository = equipajeRepository;
        this.nodoRepository = nodoRepository;
        this.eventPublisher = eventPublisher;
        this.redisCacheService = redisCacheService;
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

        redisCacheService.actualizarCargaDisponibleVuelo(vuelo.getId(), 0);
        for (NodoLogistico nodo : nodoRepository.findAllByOrderByCodigoIataAsc()) {
            redisCacheService.actualizarOcupacionNodo(nodo.getId(), nodo.getOcupacionActual());
        }

        eventPublisher.publishEvent(new VueloCanceladoEvent(vuelo.getId(), OffsetDateTime.now(), request.causa()));

        return new CancelacionResponse(
                vuelo.getId(),
                "CANCELADO",
                afectados,
                UUID.randomUUID()
        );
    }

    public static class VueloNoEncontradoException extends RuntimeException {
        public VueloNoEncontradoException(String msg) { super(msg); }
    }

    public static class CancelacionInvalidaException extends RuntimeException {
        public CancelacionInvalidaException(String msg) { super(msg); }
    }
}