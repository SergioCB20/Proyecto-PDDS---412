package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.domain.*;
import com.tasfb2b.backend.bc1.infrastructure.*;
import com.tasfb2b.backend.bc2.domain.EstadoSesion;
import com.tasfb2b.backend.bc2.domain.TipoSesion;
import com.tasfb2b.backend.bc2.infrastructure.SesionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
public class OperacionTickService {

    private static final Logger log = LoggerFactory.getLogger(OperacionTickService.class);

    private final VueloRepository vueloRepository;
    private final EquipajeRepository equipajeRepository;
    private final SegmentoPlanRepository segmentoPlanRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final VueloService vueloService;
    private final OperacionTelemetriaService operacionTelemetriaService;
    private final SesionRepository sesionRepository;
    private final OcupacionNodoService ocupacionNodoService;

    public OperacionTickService(VueloRepository vueloRepository,
                                 EquipajeRepository equipajeRepository,
                                 SegmentoPlanRepository segmentoPlanRepository,
                                 NodoLogisticoRepository nodoRepository,
                                 VueloService vueloService,
                                 OperacionTelemetriaService operacionTelemetriaService,
                                 SesionRepository sesionRepository,
                                 OcupacionNodoService ocupacionNodoService) {
        this.vueloRepository = vueloRepository;
        this.equipajeRepository = equipajeRepository;
        this.segmentoPlanRepository = segmentoPlanRepository;
        this.nodoRepository = nodoRepository;
        this.vueloService = vueloService;
        this.operacionTelemetriaService = operacionTelemetriaService;
        this.sesionRepository = sesionRepository;
        this.ocupacionNodoService = ocupacionNodoService;
    }

    public String getEstado() {
        var enCurso = sesionRepository.findByTipoAndEstado(TipoSesion.EN_VIVO, EstadoSesion.EN_CURSO);
        if (!enCurso.isEmpty()) return "ACTIVO";
        var pausadas = sesionRepository.findByTipoAndEstado(TipoSesion.EN_VIVO, EstadoSesion.PAUSADA);
        if (!pausadas.isEmpty()) return "PAUSADO";
        return "INACTIVO";
    }

    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void tick() {
        try {
            var enVivo = sesionRepository.findByTipoAndEstado(TipoSesion.EN_VIVO, EstadoSesion.EN_CURSO);
            if (enVivo.isEmpty()) return;

            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            procesarSalidas(now);
            procesarLlegadas(now);

            operacionTelemetriaService.emitirTelemetria();
        } catch (Exception e) {
            log.error("Error in operational tick: {}", e.getMessage(), e);
        }
    }

    private void procesarSalidas(OffsetDateTime now) {
        List<Vuelo> saliendo = vueloRepository.findByEstadoAndEsPlantillaAndHoraSalidaLessThanEqual(
                EstadoVuelo.PROGRAMADO, false, now);

        if (saliendo.isEmpty()) return;

        List<Vuelo> vuelosActualizar = new ArrayList<>();
        List<SegmentoPlan> segmentosActualizar = new ArrayList<>();
        List<Equipaje> equipajesActualizar = new ArrayList<>();
        Map<UUID, Integer> nodosCarga = new HashMap<>();

        for (Vuelo vuelo : saliendo) {
            vuelo.setEstado(EstadoVuelo.EN_RUTA);

            List<SegmentoPlan> segmentos = segmentoPlanRepository.findByVueloIdAndEstado(
                    vuelo.getId(), EstadoSegmento.PENDIENTE);

            int abordando = 0;
            for (SegmentoPlan seg : segmentos) {
                seg.setEstado(EstadoSegmento.EN_CURSO);
                segmentosActualizar.add(seg);

                if (seg.getPlanViaje() != null && seg.getPlanViaje().getEquipaje() != null) {
                    Equipaje eq = seg.getPlanViaje().getEquipaje();
                    eq.setEstado(EstadoEquipaje.EN_VUELO);
                    eq.setVueloActual(vuelo);
                    equipajesActualizar.add(eq);
                    int cantidad = eq.getCantidad() != null ? eq.getCantidad() : 1;
                    abordando += cantidad;
                    nodosCarga.merge(vuelo.getOrigen().getId(), cantidad, Integer::sum);
                }
            }

            int capacidad = vuelo.getCapacidadCarga() != null ? vuelo.getCapacidadCarga() : 0;
            vuelo.setCargaDisponible(Math.max(0, capacidad - abordando));
            vuelosActualizar.add(vuelo);
        }

        vueloRepository.saveAll(vuelosActualizar);
        segmentoPlanRepository.saveAll(segmentosActualizar);
        equipajeRepository.saveAll(equipajesActualizar);

        for (Map.Entry<UUID, Integer> entry : nodosCarga.entrySet()) {
            ocupacionNodoService.ajustar(entry.getKey(), OcupacionNodoService.OPERACION, -entry.getValue());
        }
    }

    private void procesarLlegadas(OffsetDateTime now) {
        List<Vuelo> llegando = vueloRepository.findByEstadoAndEsPlantillaAndHoraLlegadaLessThanEqual(
                EstadoVuelo.EN_RUTA, false, now);

        if (llegando.isEmpty()) return;

        List<Vuelo> vuelosActualizar = new ArrayList<>();
        List<SegmentoPlan> segmentosActualizar = new ArrayList<>();
        List<Equipaje> equipajesActualizar = new ArrayList<>();
        Map<UUID, Integer> nodosCarga = new HashMap<>();

        for (Vuelo vuelo : llegando) {
            vuelo.setEstado(EstadoVuelo.COMPLETADO);
            vuelosActualizar.add(vuelo);

            List<SegmentoPlan> segmentos = segmentoPlanRepository.findByVueloIdAndEstado(
                    vuelo.getId(), EstadoSegmento.EN_CURSO);
            for (SegmentoPlan seg : segmentos) {
                seg.setEstado(EstadoSegmento.COMPLETADO);
                segmentosActualizar.add(seg);

                if (seg.getPlanViaje() != null && seg.getPlanViaje().getEquipaje() != null) {
                    Equipaje eq = seg.getPlanViaje().getEquipaje();
                    int cantidad = eq.getCantidad() != null ? eq.getCantidad() : 1;

                    boolean esUltimoSegmento = seg.getPlanViaje().getSegmentos().stream()
                            .noneMatch(s -> s.getOrden() > seg.getOrden()
                                    && s.getEstado() != EstadoSegmento.COMPLETADO);

                    if (esUltimoSegmento) {
                        eq.setEstado(EstadoEquipaje.ENTREGADO);
                        eq.setVueloActual(null);
                    } else {
                        eq.setEstado(EstadoEquipaje.EN_ALMACEN);
                        nodosCarga.merge(vuelo.getDestino().getId(), cantidad, Integer::sum);
                    }
                    equipajesActualizar.add(eq);
                }
            }
        }

        vueloRepository.saveAll(vuelosActualizar);
        segmentoPlanRepository.saveAll(segmentosActualizar);
        equipajeRepository.saveAll(equipajesActualizar);

        for (Map.Entry<UUID, Integer> entry : nodosCarga.entrySet()) {
            ocupacionNodoService.ajustar(entry.getKey(), OcupacionNodoService.OPERACION, entry.getValue());
        }
    }
}
