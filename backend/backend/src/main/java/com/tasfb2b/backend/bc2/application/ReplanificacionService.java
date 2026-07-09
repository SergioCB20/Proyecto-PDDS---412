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
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

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
    private final MotorEnrutamiento motorEnrutamiento;

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
                                  PlanViajeRepository planViajeRepository,
                                  MotorEnrutamiento motorEnrutamiento) {
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
        this.motorEnrutamiento = motorEnrutamiento;
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
            // Restaurar capacidad en todos los vuelos del plan anterior antes de borrarlo
            List<SegmentoPlan> segmentosPrevios = segmentoPlanRepository.findByEquipajeId(eq.getId());
            if (!segmentosPrevios.isEmpty()) {
                Map<UUID, Integer> vuelosRestaurar = new java.util.HashMap<>();
                for (SegmentoPlan sp : segmentosPrevios) {
                    if (sp.getVuelo() != null) {
                        vuelosRestaurar.merge(sp.getVuelo().getId(),
                            eq.getCantidad() != null ? eq.getCantidad() : 1, Integer::sum);
                    }
                }
                for (Map.Entry<UUID, Integer> entry : vuelosRestaurar.entrySet()) {
                    Vuelo v = vueloRepository.findById(entry.getKey()).orElse(null);
                    if (v != null) {
                        v.setCargaDisponible(v.getCargaDisponible() + entry.getValue());
                        vueloRepository.save(v);
                    }
                }
            }
            segmentoPlanRepository.deleteByEquipajeId(eq.getId());
            planViajeRepository.deleteByEquipajeId(eq.getId());
            eq.setEstado(EstadoEquipaje.REGISTRADO);
            eq.setVueloActual(null);
            equipajeRepository.save(eq);
            ItemLote item = new ItemLote(UUID.randomUUID(), lote.getId(), eq.getId());
            itemLoteRepository.save(item);
        }

        // Re-enrutar inmediatamente los equipajes afectados
        List<Vuelo> programados = vueloRepository.findByEstadoAndEsPlantilla(EstadoVuelo.PROGRAMADO, false, Pageable.unpaged()).getContent();
        Map<UUID, Vuelo> vuelosMap = programados.stream().collect(Collectors.toMap(Vuelo::getId, v -> v));
        Map<String, NodoLogistico> nodosPorIata = nodoRepository.findAll().stream().collect(Collectors.toMap(NodoLogistico::getCodigoIata, n -> n));
        List<RutaResult> resultados = motorEnrutamiento.calcularRutasLote(afectados, programados, momentoVirtual, nodosPorIata);

        List<PlanViaje> planesNuevos = new ArrayList<>();
        List<SegmentoPlan> segmentosNuevos = new ArrayList<>();
        List<EquipajeReplanInfo> replanInfos = new ArrayList<>();

        for (int i = 0; i < afectados.size(); i++) {
            Equipaje eq = afectados.get(i);
            RutaResult ruta = (i < resultados.size()) ? resultados.get(i) : null;
            if (ruta == null || !ruta.exitoso() || ruta.segmentos().isEmpty()) {
                replanInfos.add(new EquipajeReplanInfo(eq.getId(),
                        eq.getIdExterno() != null ? eq.getIdExterno() : eq.getId().toString(),
                        null, null, List.of()));
                continue;
            }

            PlanViaje plan = new PlanViaje();
            plan.setId(UUID.randomUUID());
            plan.setEquipaje(eq);
            plan.setEstadoSla(EstadoSla.EN_TIEMPO);
            plan.setSesionId(sesionId);
            plan.setTiempoEntregaEst(ruta.segmentos().get(ruta.segmentos().size() - 1).horaLlegada());
            plan.setSegmentos(new ArrayList<>());

            SegmentoInfo primerSeg = ruta.segmentos().get(0);
            Vuelo primerVuelo = vuelosMap.get(primerSeg.vueloId());
            if (primerVuelo != null) {
                plan.setUbicacionTipo(UbicacionTipo.VUELO);
                plan.setUbicacionId(primerVuelo.getId());
                plan.setUbicacionLat(primerVuelo.getOrigenLat());
                plan.setUbicacionLon(primerVuelo.getOrigenLon());
            }

            List<SegmentoReplanInfo> segInfos = new ArrayList<>();
            boolean valido = true;
            for (SegmentoInfo segInfo : ruta.segmentos()) {
                Vuelo segVuelo = vuelosMap.get(segInfo.vueloId());
                if (segVuelo == null) { valido = false; break; }

                NodoLogistico segOrigen = nodosPorIata.get(segInfo.nodoOrigenIata());
                NodoLogistico segDestino = nodosPorIata.get(segInfo.nodoDestinoIata());

                SegmentoPlan seg = new SegmentoPlan();
                seg.setId(UUID.randomUUID());
                seg.setPlanViaje(plan);
                seg.setVuelo(segVuelo);
                seg.setNodoOrigen(segOrigen);
                seg.setNodoDestino(segDestino);
                seg.setOrden(segInfo.orden());
                seg.setHoraSalidaProg(segInfo.horaSalida());
                seg.setEstado(EstadoSegmento.PENDIENTE);
                segmentosNuevos.add(seg);
                plan.getSegmentos().add(seg);

                segInfos.add(new SegmentoReplanInfo(
                        segInfo.orden(), segVuelo.getId(), segVuelo.getCodigoVuelo(),
                        segInfo.nodoOrigenIata(), segInfo.nodoDestinoIata(),
                        segInfo.horaSalida() != null ? segInfo.horaSalida().toString() : null));
            }
            if (!valido) {
                replanInfos.add(new EquipajeReplanInfo(eq.getId(),
                        eq.getIdExterno() != null ? eq.getIdExterno() : eq.getId().toString(),
                        null, null, List.of()));
                continue;
            }

            planesNuevos.add(plan);

            replanInfos.add(new EquipajeReplanInfo(eq.getId(),
                    eq.getIdExterno() != null ? eq.getIdExterno() : eq.getId().toString(),
                    primerVuelo != null ? primerVuelo.getId() : null,
                    primerVuelo != null ? primerVuelo.getCodigoVuelo() : null,
                    segInfos));
        }

        if (!planesNuevos.isEmpty()) {
            planViajeRepository.saveAll(planesNuevos);
            segmentoPlanRepository.saveAll(segmentosNuevos);
            for (PlanViaje plan : planesNuevos) {
                if (plan.getEquipaje() == null || plan.getSegmentos() == null) continue;
                Equipaje eq = plan.getEquipaje();
                int cantidad = eq.getCantidad() != null ? eq.getCantidad() : 1;
                Vuelo primerVuelo = null;
                for (SegmentoPlan seg : plan.getSegmentos()) {
                    if (seg.getVuelo() != null) {
                        seg.getVuelo().setCargaDisponible(
                            seg.getVuelo().getCargaDisponible() - cantidad);
                        vueloRepository.save(seg.getVuelo());
                        if (primerVuelo == null) primerVuelo = seg.getVuelo();
                    }
                }
                eq.setEstado(EstadoEquipaje.ENRUTADO);
                eq.setVueloActual(primerVuelo);
                equipajeRepository.save(eq);
            }
        }

        eventPublisher.publishEvent(new ReplanificacionIniciada(
                lote.getId(), sesionId, afectados.size(), OffsetDateTime.now()));

        log.info("Replanificacion completada: lote={}, sesion={}, vuelo={}, equipajes={}, enrutados={}",
                lote.getId(), sesionId, vueloId, afectados.size(), planesNuevos.size());
        return new ReplanificacionResult(afectados.size(), lote.getId(),
                afectados.stream().map(Equipaje::getId).toList(), replanInfos);
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
