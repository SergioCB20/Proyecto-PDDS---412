package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import com.tasfb2b.backend.bc2.application.ReplanificacionService;
import com.tasfb2b.backend.bc2.application.SesionLockManager;
import com.tasfb2b.backend.bc2.domain.SesionEjecucion;
import com.tasfb2b.backend.bc2.infrastructure.SesionRepository;
import com.tasfb2b.backend.shared.events.VueloCanceladoEvent;
import com.tasfb2b.backend.shared.infrastructure.RedisCacheService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class CancelacionService {

    private final VueloRepository vueloRepository;
    private final EquipajeRepository equipajeRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final RedisCacheService redisCacheService;
    private final ReplanificacionService replanificacionService;
    private final SesionRepository sesionRepository;
    private final SesionLockManager lockManager;

    public CancelacionService(VueloRepository vueloRepository, EquipajeRepository equipajeRepository,
                              NodoLogisticoRepository nodoRepository, ApplicationEventPublisher eventPublisher,
                              RedisCacheService redisCacheService,
                              ReplanificacionService replanificacionService,
                              SesionRepository sesionRepository,
                              SesionLockManager lockManager) {
        this.vueloRepository = vueloRepository;
        this.equipajeRepository = equipajeRepository;
        this.nodoRepository = nodoRepository;
        this.eventPublisher = eventPublisher;
        this.redisCacheService = redisCacheService;
        this.replanificacionService = replanificacionService;
        this.sesionRepository = sesionRepository;
        this.lockManager = lockManager;
    }

    public record CancelacionRequest(UUID vuelo_id, String causa, UUID sesion_id) {}

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

        // Cancelacion DENTRO de una simulacion: usa el mismo camino que la cancelacion
        // probabilistica del tick (replanificarEnSesion). Ese metodo captura tanto las
        // maletas EN_VUELO como las ENRUTADO con segmento PENDIENTE (las de un vuelo
        // PROGRAMADO que aun no despega) y las re-encola para armar un nuevo plan. El
        // camino legacy (VueloCanceladoEvent) solo reencola EN_VUELO, dejando huerfanas
        // las ENRUTADO -> se apilan en el nodo y la simulacion colapsa.
        if (request.sesion_id() != null) {
            return cancelarEnSimulacion(vuelo, request.sesion_id(), request.causa());
        }

        // Camino legacy (operacion real, sin sesion).
        int afectados = (int) equipajeRepository.countByVueloActualId(vuelo.getId());

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

    private CancelacionResponse cancelarEnSimulacion(Vuelo vuelo, UUID sesionId, String causa) {
        SesionEjecucion sesion = sesionRepository.findById(sesionId)
                .orElseThrow(() -> new CancelacionInvalidaException("Sesion no encontrada: " + sesionId));

        OffsetDateTime virtual = sesion.getDiaHoraVirtual() != null
                ? sesion.getDiaHoraVirtual() : OffsetDateTime.now();
        String causaFinal = causa != null ? causa : "Cancelacion manual";

        // Serializa con el tick y el planificador de la misma sesion para no mutar a la vez
        // segmentos_plan/vuelos/nodos (evita StaleObjectStateException).
        ReentrantLock lock = lockManager.obtener(sesionId);
        lock.lock();
        try {
            int afectados = replanificacionService.replanificarEnSesion(
                    sesionId, vuelo.getId(), causaFinal, virtual);
            return new CancelacionResponse(vuelo.getId(), "CANCELADO", afectados, UUID.randomUUID());
        } finally {
            lock.unlock();
        }
    }

    public static class VueloNoEncontradoException extends RuntimeException {
        public VueloNoEncontradoException(String msg) { super(msg); }
    }

    public static class CancelacionInvalidaException extends RuntimeException {
        public CancelacionInvalidaException(String msg) { super(msg); }
    }
}