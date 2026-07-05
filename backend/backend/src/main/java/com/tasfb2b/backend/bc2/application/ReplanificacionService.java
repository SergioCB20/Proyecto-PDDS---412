package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.*;
import com.tasfb2b.backend.bc1.infrastructure.*;
import com.tasfb2b.backend.bc2.domain.*;
import java.util.stream.Stream;
import com.tasfb2b.backend.bc2.infrastructure.*;
import com.tasfb2b.backend.shared.events.ReplanificacionIniciada;
import com.tasfb2b.backend.shared.events.VueloCanceladoEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ReplanificacionService {

    private static final Logger log = LoggerFactory.getLogger(ReplanificacionService.class);

    private final EquipajeRepository equipajeRepository;
    private final VueloRepository vueloRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final ColaPlanificacionRepository colaRepository;
    private final EventoCancelacionRepository eventoCancelacionRepository;
    private final LoteReplanificacionRepository loteRepository;
    private final ItemLoteRepository itemLoteRepository;
    private final SesionRepository sesionRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final SegmentoPlanRepository segmentoPlanRepository;
    private final PlanViajeRepository planViajeRepository;

    public ReplanificacionService(EquipajeRepository equipajeRepository,
                                  VueloRepository vueloRepository,
                                  NodoLogisticoRepository nodoRepository,
                                  ColaPlanificacionRepository colaRepository,
                                  EventoCancelacionRepository eventoCancelacionRepository,
                                  LoteReplanificacionRepository loteRepository,
                                  ItemLoteRepository itemLoteRepository,
                                  SesionRepository sesionRepository,
                                  ApplicationEventPublisher eventPublisher,
                                  SegmentoPlanRepository segmentoPlanRepository,
                                  PlanViajeRepository planViajeRepository) {
        this.equipajeRepository = equipajeRepository;
        this.vueloRepository = vueloRepository;
        this.nodoRepository = nodoRepository;
        this.colaRepository = colaRepository;
        this.eventoCancelacionRepository = eventoCancelacionRepository;
        this.loteRepository = loteRepository;
        this.itemLoteRepository = itemLoteRepository;
        this.sesionRepository = sesionRepository;
        this.eventPublisher = eventPublisher;
        this.segmentoPlanRepository = segmentoPlanRepository;
        this.planViajeRepository = planViajeRepository;
    }

    @Transactional
    public ReplanificacionResult replanificarEnSesion(UUID sesionId, UUID vueloId, String causa, OffsetDateTime momentoVirtual) {
        Vuelo vuelo = vueloRepository.findById(vueloId)
                .orElseThrow(() -> new IllegalArgumentException("Vuelo no encontrado: " + vueloId));

        // Equipajes EN_VUELO actualmente en este vuelo
        List<Equipaje> enVuelo = equipajeRepository.findByVueloActualId(vueloId);
        // Equipajes ENRUTADOS cuyo segmento pendiente usa este vuelo (vuelo aún no salió)
        List<Equipaje> enrutadosPendientes = segmentoPlanRepository
                .findEquipajesByVueloIdAndEstado(vueloId, EstadoSegmento.PENDIENTE);
        List<Equipaje> afectados = Stream.concat(enVuelo.stream(), enrutadosPendientes.stream())
                .distinct().collect(java.util.stream.Collectors.toList());

        vuelo.setEstado(EstadoVuelo.CANCELADO);
        vueloRepository.save(vuelo);

        EventoCancelacion evento = new EventoCancelacion(
                UUID.randomUUID(), sesionId, vueloId, "SIMULACION");
        evento.setCausa(causa);
        evento.setOcurridoEnVirtual(momentoVirtual);
        eventoCancelacionRepository.save(evento);

        LoteReplanificacion lote = new LoteReplanificacion(
                UUID.randomUUID(), evento.getId(), sesionId);
        lote.setTotalEquipajes(afectados.size());
        loteRepository.save(lote);

        for (Equipaje eq : afectados) {
            // La ruta quedó rota por la cancelación. Hay que borrar el plan + segmentos
            // anteriores: UNIQUE(equipaje_id) en planes_viaje obliga a limpiar antes de que
            // la próxima ventana del planificador ACO re-enrute la maleta. Se deja en
            // REGISTRADO y NO se encola en cola_planificacion: así la replanificación ocurre
            // dentro de la sesión (plan con sesion_id) y no la "roba" el PlanificacionWorker
            // día a día, que crearía un plan con sesion_id = NULL invisible para el reporte.
            segmentoPlanRepository.deleteByEquipajeId(eq.getId());
            planViajeRepository.deleteByEquipajeId(eq.getId());

            eq.setEstado(EstadoEquipaje.REGISTRADO);
            eq.setVueloActual(null);
            equipajeRepository.save(eq);

            ItemLote item = new ItemLote(UUID.randomUUID(), lote.getId(), eq.getId());
            itemLoteRepository.save(item);
        }

        eventPublisher.publishEvent(new ReplanificacionIniciada(
                lote.getId(), sesionId, afectados.size(), OffsetDateTime.now()));

        log.info("Replanificacion iniciada: lote={}, sesion={}, vuelo={}, equipajes={}",
                lote.getId(), sesionId, vueloId, afectados.size());
        return new ReplanificacionResult(afectados.size(), lote.getId(),
                afectados.stream().map(Equipaje::getId).toList());
    }

    @EventListener
    @Transactional
    public void onVueloCancelado(VueloCanceladoEvent event) {
        List<Equipaje> afectados = equipajeRepository.findByVueloActualId(event.vueloId());
        if (afectados.isEmpty()) return;

        for (Equipaje eq : afectados) {
            eq.setEstado(EstadoEquipaje.EN_REPLANIFICACION);
            eq.setVueloActual(null);
            equipajeRepository.save(eq);

            ColaPlanificacion colaItem = new ColaPlanificacion();
            colaItem.setId(UUID.randomUUID());
            colaItem.setEquipajeId(eq.getId());
            colaItem.setTipo(TipoCola.REPLANIFICACION);
            colaItem.setEstado(EstadoCola.PENDIENTE);
            colaItem.setIntentos(0);
            colaItem.setFechaCreacion(OffsetDateTime.now());
            colaRepository.save(colaItem);
        }

        log.info("VueloCanceladoEvent: vuelo={}, equipajes encolados={}", event.vueloId(), afectados.size());
    }
}
