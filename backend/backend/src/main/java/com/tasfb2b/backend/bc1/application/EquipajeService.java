package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.domain.*;
import com.tasfb2b.backend.bc1.domain.EstadoSla;
import com.tasfb2b.backend.bc1.domain.UbicacionTipo;
import com.tasfb2b.backend.bc1.domain.EstadoSegmento;
import com.tasfb2b.backend.bc1.infrastructure.*;
import com.tasfb2b.backend.shared.events.EquipajeIngresadoEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class EquipajeService {

    private final EquipajeRepository equipajeRepository;
    private final PlanViajeRepository planViajeRepository;
    private final SegmentoPlanRepository segmentoPlanRepository;
    private final VueloRepository vueloRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final ApplicationEventPublisher eventPublisher;

    public EquipajeService(EquipajeRepository equipajeRepository, PlanViajeRepository planViajeRepository,
                           SegmentoPlanRepository segmentoPlanRepository, VueloRepository vueloRepository,
                           NodoLogisticoRepository nodoRepository, ApplicationEventPublisher eventPublisher) {
        this.equipajeRepository = equipajeRepository;
        this.planViajeRepository = planViajeRepository;
        this.segmentoPlanRepository = segmentoPlanRepository;
        this.vueloRepository = vueloRepository;
        this.nodoRepository = nodoRepository;
        this.eventPublisher = eventPublisher;
    }

    public record RegistrarEquipajeRequest(
            String id_equipaje,
            String destino_iata,
            UUID vuelo_id,
            OffsetDateTime sla_comprometido
    ) {}

    public record EquipajeResponse(
            UUID id,
            String estado,
            String id_externo,
            String destino_iata,
            PlanViajeResponse plan_viaje
    ) {}

    public record PlanViajeResponse(
            UUID id,
            String estado_sla,
            OffsetDateTime tiempo_entrega_est,
            List<SegmentoResponse> segmentos
    ) {}

    public record SegmentoResponse(
            Integer orden,
            String vuelo_codigo,
            String nodo_origen,
            String nodo_destino,
            OffsetDateTime hora_salida_prog
    ) {}

    @Transactional
    public EquipajeResponse registrar(UUID operadorNodoId, RegistrarEquipajeRequest request) {
        NodoLogistico nodoOrigen = nodoRepository.findById(operadorNodoId)
                .orElseThrow(() -> new ValidacionException("Nodo asignado al operador no encontrado"));

        NodoLogistico nodoDestino = nodoRepository.findByCodigoIata(request.destino_iata())
                .orElseThrow(() -> new ValidacionException("Destino IATA no existe: " + request.destino_iata()));

        Vuelo vuelo = vueloRepository.findById(request.vuelo_id())
                .orElseThrow(() -> new ValidacionException("Vuelo no encontrado: " + request.vuelo_id()));

        if (vuelo.getEstado() != EstadoVuelo.PROGRAMADO) {
            throw new ValidacionException("El vuelo no esta en estado PROGRAMADO");
        }

        if (vuelo.getCargaDisponible() <= 0) {
            throw new ValidacionException("Capacidad del vuelo agotada");
        }

        if (nodoOrigen.getOcupacionActual() >= nodoOrigen.getCapacidadAlmacen()) {
            throw new ValidacionException("Capacidad del almacen superada en nodo " + nodoOrigen.getCodigoIata());
        }

        Equipaje equipaje = new Equipaje();
        equipaje.setId(UUID.randomUUID());
        equipaje.setIdExterno(request.id_equipaje());
        equipaje.setDestinoIata(request.destino_iata());
        equipaje.setSlaComprometido(request.sla_comprometido());
        equipaje.setFechaIngreso(OffsetDateTime.now());
        equipaje.setEstado(EstadoEquipaje.ENRUTADO);
        equipaje.setVueloActual(vuelo);
        equipajeRepository.save(equipaje);

        eventPublisher.publishEvent(new EquipajeIngresadoEvent(equipaje.getId(), OffsetDateTime.now()));

        PlanViaje planViaje = new PlanViaje();
        planViaje.setId(UUID.randomUUID());
        planViaje.setEquipaje(equipaje);
        planViaje.setEstadoSla(EstadoSla.EN_TIEMPO);
        planViaje.setTiempoEntregaEst(vuelo.getHoraLlegada());
        planViaje.setUbicacionTipo(UbicacionTipo.VUELO);
        planViaje.setUbicacionId(vuelo.getId());
        planViaje.setUbicacionLat(vuelo.getOrigenLat());
        planViaje.setUbicacionLon(vuelo.getOrigenLon());
        planViajeRepository.save(planViaje);

        SegmentoPlan segmento = new SegmentoPlan();
        segmento.setId(UUID.randomUUID());
        segmento.setPlanViaje(planViaje);
        segmento.setVuelo(vuelo);
        segmento.setNodoOrigen(vuelo.getOrigen());
        segmento.setNodoDestino(vuelo.getDestino());
        segmento.setOrden(1);
        segmento.setHoraSalidaProg(vuelo.getHoraSalida());
        segmento.setEstado(EstadoSegmento.PENDIENTE);
        segmentoPlanRepository.save(segmento);

        nodoOrigen.setOcupacionActual(nodoOrigen.getOcupacionActual() + 1);
        nodoRepository.save(nodoOrigen);

        vuelo.setCargaDisponible(vuelo.getCargaDisponible() - 1);
        vueloRepository.save(vuelo);

        return toEquipajeResponse(equipaje, planViaje, List.of(segmento));
    }

    public EquipajeResponse obtenerPlanViaje(UUID equipajeId) {
        Equipaje equipaje = equipajeRepository.findById(equipajeId)
                .orElseThrow(() -> new EquipajeNoEncontradoException("Equipaje no encontrado: " + equipajeId));

        PlanViaje planViaje = planViajeRepository.findByEquipajeId(equipajeId)
                .orElseThrow(() -> new ValidacionException("Plan de viaje no encontrado"));

        List<SegmentoPlan> segmentos = segmentoPlanRepository.findByPlanViajeIdOrderByOrdenAsc(planViaje.getId());

        return toEquipajeResponse(equipaje, planViaje, segmentos);
    }

    public record PlanViajeDetalleResponse(
            UUID equipaje_id,
            String estado,
            UbicacionResponse ubicacion_actual,
            String estado_sla,
            OffsetDateTime tiempo_entrega_est,
            List<SegmentoResponse> segmentos
    ) {}

    public record UbicacionResponse(
            String tipo,
            UUID referencia_id,
            Double lat,
            Double lon
    ) {}

    public PlanViajeDetalleResponse obtenerDetallePlanViaje(UUID equipajeId) {
        Equipaje equipaje = equipajeRepository.findById(equipajeId)
                .orElseThrow(() -> new EquipajeNoEncontradoException("Equipaje no encontrado: " + equipajeId));

        PlanViaje planViaje = planViajeRepository.findByEquipajeId(equipajeId)
                .orElseThrow(() -> new ValidacionException("Plan de viaje no encontrado"));

        List<SegmentoPlan> segmentos = segmentoPlanRepository.findByPlanViajeIdOrderByOrdenAsc(planViaje.getId());

        UbicacionResponse ubicacion = null;
        if (planViaje.getUbicacionTipo() != null) {
            ubicacion = new UbicacionResponse(
                    planViaje.getUbicacionTipo().name(),
                    planViaje.getUbicacionId(),
                    planViaje.getUbicacionLat() != null ? planViaje.getUbicacionLat().doubleValue() : null,
                    planViaje.getUbicacionLon() != null ? planViaje.getUbicacionLon().doubleValue() : null
            );
        }

        List<SegmentoResponse> segs = segmentos.stream()
                .map(s -> new SegmentoResponse(
                        s.getOrden(),
                        s.getVuelo().getCodigoVuelo(),
                        s.getNodoOrigen().getCodigoIata(),
                        s.getNodoDestino().getCodigoIata(),
                        s.getHoraSalidaProg()
                ))
                .toList();

        return new PlanViajeDetalleResponse(
                equipaje.getId(),
                equipaje.getEstado().name(),
                ubicacion,
                planViaje.getEstadoSla().name(),
                planViaje.getTiempoEntregaEst(),
                segs
        );
    }

    private EquipajeResponse toEquipajeResponse(Equipaje equipaje, PlanViaje planViaje, List<SegmentoPlan> segmentos) {
        List<SegmentoResponse> segs = segmentos.stream()
                .map(s -> new SegmentoResponse(
                        s.getOrden(),
                        s.getVuelo().getCodigoVuelo(),
                        s.getNodoOrigen().getCodigoIata(),
                        s.getNodoDestino().getCodigoIata(),
                        s.getHoraSalidaProg()
                ))
                .toList();

        PlanViajeResponse pv = new PlanViajeResponse(
                planViaje.getId(),
                planViaje.getEstadoSla().name(),
                planViaje.getTiempoEntregaEst(),
                segs
        );

        return new EquipajeResponse(
                equipaje.getId(),
                equipaje.getEstado().name(),
                equipaje.getIdExterno(),
                equipaje.getDestinoIata(),
                pv
        );
    }

    public static class EquipajeNoEncontradoException extends RuntimeException {
        public EquipajeNoEncontradoException(String msg) { super(msg); }
    }

    public static class ValidacionException extends RuntimeException {
        public ValidacionException(String msg) { super(msg); }
    }
}