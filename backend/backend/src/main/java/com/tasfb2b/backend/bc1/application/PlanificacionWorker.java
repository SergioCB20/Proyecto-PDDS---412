package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.domain.*;
import com.tasfb2b.backend.bc1.infrastructure.*;
import com.tasfb2b.backend.bc1.domain.EstadoCola;
import com.tasfb2b.backend.bc1.domain.EstadoEquipaje;
import com.tasfb2b.backend.bc1.domain.EstadoSla;
import com.tasfb2b.backend.bc1.domain.EstadoSegmento;
import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.PlanViaje;
import com.tasfb2b.backend.bc1.domain.SegmentoPlan;
import com.tasfb2b.backend.bc1.domain.UbicacionTipo;
import com.tasfb2b.backend.bc1.infrastructure.ColaPlanificacionRepository;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import com.tasfb2b.backend.bc1.infrastructure.PlanViajeRepository;
import com.tasfb2b.backend.bc1.infrastructure.SegmentoPlanRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import com.tasfb2b.backend.bc2.application.MotorEnrutamiento;
import com.tasfb2b.backend.bc2.application.RutaResult;
import com.tasfb2b.backend.bc2.application.RoutingStrategy;
import com.tasfb2b.backend.bc2.application.SegmentoInfo;
import com.tasfb2b.backend.shared.events.EquipajePlanificadoEvent;
import com.tasfb2b.backend.shared.events.PlanViajeCreado;
import com.tasfb2b.backend.shared.infrastructure.RedisCacheService;
import com.tasfb2b.backend.shared.infrastructure.SseService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PlanificacionWorker {

    private static final Logger log = LoggerFactory.getLogger(PlanificacionWorker.class);
    private static final int MAX_INTENTOS = 3;
    private static final long TIMEOUT_MINUTOS = 5;
    private static final int BATCH_SIZE = 50;

    private final ColaPlanificacionRepository colaRepository;
    private final EquipajeRepository equipajeRepository;
    private final VueloRepository vueloRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final PlanViajeRepository planViajeRepository;
    private final SegmentoPlanRepository segmentoPlanRepository;
    private final MotorEnrutamiento motorEnrutamiento;
    private final ApplicationEventPublisher eventPublisher;
    private final RedisCacheService redisCacheService;
    private final SseService sseService;
    private final OcupacionNodoService ocupacionNodoService;

    @Autowired
    private ApplicationContext applicationContext;

    /** Referencia al proxy del propio bean para que @Transactional aplique en llamadas internas. */
    private PlanificacionWorker self() {
        return applicationContext.getBean(PlanificacionWorker.class);
    }

    public PlanificacionWorker(ColaPlanificacionRepository colaRepository,
                                EquipajeRepository equipajeRepository,
                                VueloRepository vueloRepository,
                                NodoLogisticoRepository nodoRepository,
                                PlanViajeRepository planViajeRepository,
                                SegmentoPlanRepository segmentoPlanRepository,
                                MotorEnrutamiento motorEnrutamiento,
                                ApplicationEventPublisher eventPublisher,
                                RedisCacheService redisCacheService,
                                SseService sseService,
                                OcupacionNodoService ocupacionNodoService) {
        this.colaRepository = colaRepository;
        this.equipajeRepository = equipajeRepository;
        this.vueloRepository = vueloRepository;
        this.nodoRepository = nodoRepository;
        this.planViajeRepository = planViajeRepository;
        this.segmentoPlanRepository = segmentoPlanRepository;
        this.motorEnrutamiento = motorEnrutamiento;
        this.eventPublisher = eventPublisher;
        this.redisCacheService = redisCacheService;
        this.sseService = sseService;
        this.ocupacionNodoService = ocupacionNodoService;
    }

    @Scheduled(fixedDelay = 500)
    public void procesarCola() {
        self().procesarTimeoutItems();
        procesarBatch();
    }

    private void procesarItemSimple() {
        ColaPlanificacion item = colaRepository.findTopByEstadoWithLock(EstadoCola.PENDIENTE.name())
                .orElse(null);
        if (item == null) {
            return;
        }
        procesarItem(item);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public List<ColaPlanificacion> fetchBatch() {
        return colaRepository.findBatchByEstadoWithLock(
                EstadoCola.PENDIENTE.name(), BATCH_SIZE);
    }

    private void procesarBatch() {
        List<ColaPlanificacion> items = self().fetchBatch();
        if (items.isEmpty()) {
            return;
        }

        List<Equipaje> equipajes = new ArrayList<>();
        for (ColaPlanificacion item : items) {
            equipajeRepository.findById(item.getEquipajeId()).ifPresent(equipajes::add);
        }

        String destinoIata = equipajes.get(0).getDestinoIata();
        boolean todosMismoDestino = equipajes.stream().allMatch(e -> e.getDestinoIata().equals(destinoIata));

        if (todosMismoDestino && items.size() > 1) {
            procesarBatchOptimizado(items, equipajes);
        } else {
            // Cada item en su propia transaccion: un fallo (p.ej. duplicate key) no
            // envenena el resto del lote ni revierte el incremento de intentos.
            for (ColaPlanificacion item : items) {
                try {
                    self().procesarItem(item);
                } catch (Exception e) {
                    log.error("Error procesando item {}: {}", item.getId(), e.getMessage());
                }
            }
        }
    }

    private void procesarBatchOptimizado(List<ColaPlanificacion> items, List<Equipaje> equipajes) {
        List<RutaResult> resultados = motorEnrutamiento.calcularRutasLote(equipajes);

        for (int i = 0; i < items.size() && i < resultados.size(); i++) {
            ColaPlanificacion item = items.get(i);
            Equipaje equipaje = equipajes.get(i);
            RutaResult ruta = resultados.get(i);

            if (equipaje == null) continue;

            // Cada item se completa en transaccion propia (REQUIRES_NEW) para aislar fallos.
            try {
                self().completarOItemFallido(item, equipaje, ruta);
            } catch (Exception e) {
                log.error("Error completando item {} en batch: {}", item.getId(), e.getMessage());
                try {
                    self().manejarFalloTx(item, e.getMessage());
                } catch (Exception ignored) {
                    log.error("Error registrando fallo del item {}: {}", item.getId(), ignored.getMessage());
                }
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void completarOItemFallido(ColaPlanificacion item, Equipaje equipaje, RutaResult ruta) {
        if (ruta != null && ruta.exitoso() && !ruta.segmentos().isEmpty()) {
            completarItemConRuta(item, equipaje, ruta);
        } else {
            manejarFallo(item, ruta != null ? ruta.mensajeError() : "Error al calcular ruta");
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void manejarFalloTx(ColaPlanificacion item, String error) {
        manejarFallo(item, error);
    }

    private void completarItemConRuta(ColaPlanificacion item, Equipaje equipaje, RutaResult ruta) {
        Vuelo vueloActual = equipaje.getVueloActual();
        NodoLogistico origen;
        if (vueloActual != null) {
            origen = vueloActual.getOrigen();
            if (origen == null) {
                throw new RuntimeException("Vuelo " + vueloActual.getId() + " no tiene nodo origen");
            }
            int capOrigen = origen.getCapacidadAlmacen() != null ? origen.getCapacidadAlmacen() : 0;
            if (ocupacionNodoService.leer(origen.getId(), OcupacionNodoService.OPERACION) >= capOrigen) {
                throw new RuntimeException("Capacidad de almacen superada en " + origen.getCodigoIata());
            }
            if (vueloActual.getCargaDisponible() <= 0) {
                throw new RuntimeException("Capacidad del vuelo " + vueloActual.getCodigoVuelo() + " agotada");
            }
        } else {
            origen = nodoRepository.findByCodigoIata(equipaje.getOrigenIata())
                    .orElseThrow(() -> new RuntimeException("Origen no encontrado: " + equipaje.getOrigenIata()));
        }

        // Replanificacion: el equipaje puede tener un plan previo. Restaurar capacidad
        // en todos los vuelos del plan anterior antes de borrarlo.
        List<SegmentoPlan> segmentosPrevios = segmentoPlanRepository.findByEquipajeId(equipaje.getId());
        if (!segmentosPrevios.isEmpty()) {
            Map<UUID, Integer> vuelosRestaurar = new java.util.HashMap<>();
            for (SegmentoPlan sp : segmentosPrevios) {
                if (sp.getVuelo() != null) {
                    vuelosRestaurar.merge(sp.getVuelo().getId(),
                        equipaje.getCantidad() != null ? equipaje.getCantidad() : 1, Integer::sum);
                }
            }
            for (Map.Entry<UUID, Integer> entry : vuelosRestaurar.entrySet()) {
                vueloRepository.incrementarCargaDisponible(entry.getKey(), entry.getValue());
            }
        }
        // La constraint planes_viaje_equipaje_id_key es UNIQUE(equipaje_id), asi que hay que borrar
        // el plan + segmentos anteriores antes de crear el nuevo, o el insert revienta.
        segmentoPlanRepository.deleteByEquipajeId(equipaje.getId());
        planViajeRepository.deleteByEquipajeId(equipaje.getId());
        planViajeRepository.flush();

        PlanViaje planViaje = new PlanViaje();
        planViaje.setId(UUID.randomUUID());
        planViaje.setEquipaje(equipaje);
        planViaje.setEstadoSla(EstadoSla.EN_TIEMPO);
        planViaje.setTiempoEntregaEst(ruta.segmentos().get(ruta.segmentos().size() - 1).horaLlegada());
        planViaje.setUbicacionTipo(UbicacionTipo.VUELO);
        planViaje.setUbicacionId(ruta.segmentos().get(0).vueloId());
        planViaje.setUbicacionLat(origen.getLatitud());
        planViaje.setUbicacionLon(origen.getLongitud());
        planViajeRepository.save(planViaje);

        for (SegmentoInfo segInfo : ruta.segmentos()) {
            Vuelo segVuelo = vueloRepository.findById(segInfo.vueloId())
                    .orElseThrow(() -> new RuntimeException("Vuelo no encontrado: " + segInfo.vueloId()));
            NodoLogistico segOrigen = nodoRepository.findById(segInfo.nodoOrigenId())
                    .orElseThrow(() -> new RuntimeException("Nodo origen no encontrado: " + segInfo.nodoOrigenId()));
            NodoLogistico segDestino = nodoRepository.findById(segInfo.nodoDestinoId())
                    .orElseThrow(() -> new RuntimeException("Nodo destino no encontrado: " + segInfo.nodoDestinoId()));

            SegmentoPlan segmento = new SegmentoPlan();
            segmento.setId(UUID.randomUUID());
            segmento.setPlanViaje(planViaje);
            segmento.setVuelo(segVuelo);
            segmento.setNodoOrigen(segOrigen);
            segmento.setNodoDestino(segDestino);
            segmento.setOrden(segInfo.orden());
            segmento.setHoraSalidaProg(segInfo.horaSalida());
            segmento.setEstado(EstadoSegmento.PENDIENTE);
            segmentoPlanRepository.save(segmento);
        }

        int cantidad = equipaje.getCantidad() != null ? equipaje.getCantidad() : 1;

        // Reservar capacidad en TODOS los vuelos del plan, no solo el primero
        for (SegmentoInfo segInfo : ruta.segmentos()) {
            Vuelo segVuelo = vueloRepository.findById(segInfo.vueloId())
                    .orElseThrow(() -> new RuntimeException("Vuelo no encontrado: " + segInfo.vueloId()));
            vueloRepository.decrementarCargaDisponible(segVuelo.getId(), cantidad);
            int capAct = vueloRepository.findById(segVuelo.getId())
                    .map(Vuelo::getCargaDisponible).orElse(segVuelo.getCargaDisponible() - cantidad);
            redisCacheService.actualizarCargaDisponibleVuelo(segVuelo.getId(), capAct);
        }

        SegmentoInfo primerSegmento = ruta.segmentos().get(0);
        Vuelo primerVuelo = vueloRepository.findById(primerSegmento.vueloId())
                .orElseThrow(() -> new RuntimeException("Vuelo no encontrado: " + primerSegmento.vueloId()));
        NodoLogistico primerNodoOrigen = nodoRepository.findById(primerSegmento.nodoOrigenId())
                .orElseThrow(() -> new RuntimeException("Nodo no encontrado: " + primerSegmento.nodoOrigenId()));

        // Ocupación del nodo origen en el contexto de la operación día a día (no el global).
        ocupacionNodoService.ajustar(primerNodoOrigen.getId(), OcupacionNodoService.OPERACION, cantidad);

        equipaje.setEstado(EstadoEquipaje.ENRUTADO);
        equipaje.setVueloActual(primerVuelo);
        equipajeRepository.save(equipaje);

        int ocupacionActualizada = ocupacionNodoService.leer(
                primerNodoOrigen.getId(), OcupacionNodoService.OPERACION);
        redisCacheService.actualizarOcupacionNodo(primerNodoOrigen.getId(), ocupacionActualizada);

        eventPublisher.publishEvent(new EquipajePlanificadoEvent(
                equipaje.getId(), planViaje.getId(),
                item.getTipo().name(), "COMPLETADO", OffsetDateTime.now()));

        eventPublisher.publishEvent(new PlanViajeCreado(
                equipaje.getId(), planViaje.getId(), null, OffsetDateTime.now()));

        item.setEstado(EstadoCola.COMPLETADO);
        item.setFechaProcesado(OffsetDateTime.now());
        colaRepository.save(item);

        notificarSse(item, equipaje, planViaje, true, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void procesarItem(ColaPlanificacion item) {
        item.setEstado(EstadoCola.EN_PROCESO);
        colaRepository.save(item);

        try {
            Equipaje equipaje = equipajeRepository.findById(item.getEquipajeId())
                    .orElseThrow(() -> new RuntimeException("Equipaje no encontrado: " + item.getEquipajeId()));

            NodoLogistico origen = nodoRepository.findByCodigoIata(equipaje.getOrigenIata())
                    .orElse(null);
            if (origen == null) {
                throw new RuntimeException("Origen no encontrado para equipaje: " + equipaje.getOrigenIata());
            }

            boolean hayVuelos = !vueloRepository.findByEstadoAndEsPlantilla(EstadoVuelo.PROGRAMADO, false, Pageable.unpaged()).getContent().isEmpty();
            if (!hayVuelos) {
                item.setEstado(EstadoCola.PENDIENTE);
                colaRepository.save(item);
                log.debug("Item {} postergado: no hay vuelos PROGRAMADO disponibles", item.getId());
                return;
            }

            RutaResult ruta = motorEnrutamiento.calcularRuta(
                    origen,
                    equipaje.getDestinoIata(),
                    equipaje.getSlaComprometido());

            if (ruta == null || !ruta.exitoso() || ruta.segmentos().isEmpty()) {
                throw new RuntimeException(ruta != null ? ruta.mensajeError() : "Error al calcular ruta");
            }

            completarItemConRuta(item, equipaje, ruta);

        } catch (Exception e) {
            log.error("Error procesando item {}: {}", item.getId(), e.getMessage());
            manejarFallo(item, e.getMessage());
        }
    }

    private void manejarFallo(ColaPlanificacion item, String error) {
        item.setIntentos(item.getIntentos() + 1);
        item.setError(error);

        if (item.getIntentos() >= MAX_INTENTOS) {
            item.setEstado(EstadoCola.FALLIDO);
            item.setFechaProcesado(OffsetDateTime.now());
            colaRepository.save(item);

            equipajeRepository.findById(item.getEquipajeId()).ifPresent(eq -> {
                if (item.getTipo() == TipoCola.REPLANIFICACION) {
                    eq.setEstado(EstadoEquipaje.EN_ALMACEN);
                } else {
                    eq.setEstado(EstadoEquipaje.INCUMPLIMIENTO_SLA);
                }
                equipajeRepository.save(eq);
            });

            Equipaje eq = equipajeRepository.findById(item.getEquipajeId()).orElse(null);
            notificarSse(item, eq, null, false, error);

            eventPublisher.publishEvent(new EquipajePlanificadoEvent(
                    item.getEquipajeId(), null,
                    item.getTipo().name(), "FALLIDO", OffsetDateTime.now()));
        } else {
            item.setEstado(EstadoCola.PENDIENTE);
            colaRepository.save(item);
            log.warn("Item {} reintento {}/{}: {}", item.getId(), item.getIntentos(), MAX_INTENTOS, error);
        }
    }

    private void notificarSse(ColaPlanificacion item, Equipaje equipaje, PlanViaje planViaje,
                              boolean exitoso, String error) {
        Map<String, Object> data = new java.util.LinkedHashMap<>();
        data.put("equipaje_id", item.getEquipajeId().toString());
        if (equipaje != null) {
            data.put("id_externo", equipaje.getIdExterno());
        }
        data.put("tipo", item.getTipo().name());
        data.put("estado", exitoso ? "COMPLETADO" : "FALLIDO");

        if (exitoso && planViaje != null) {
            List<Map<String, Object>> segmentos = planViaje.getSegmentos().stream()
                    .map(s -> Map.<String, Object>of(
                            "orden", s.getOrden(),
                            "vuelo_codigo", s.getVuelo().getCodigoVuelo(),
                            "nodo_origen", s.getNodoOrigen().getCodigoIata(),
                            "nodo_destino", s.getNodoDestino().getCodigoIata(),
                            "hora_salida", s.getHoraSalidaProg().toString()))
                    .toList();
            data.put("plan_viaje", Map.of("id", planViaje.getId().toString(), "segmentos", segmentos));
        }

        if (!exitoso) {
            data.put("error", error != null ? error : "Error desconocido");
        }

        sseService.broadcast(exitoso ? "planificacion-completada" : "planificacion-fallida", data);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void procesarTimeoutItems() {
        OffsetDateTime threshold = OffsetDateTime.now().minusMinutes(TIMEOUT_MINUTOS);
        List<ColaPlanificacion> colgados = colaRepository.findByEstadoAndFechaCreacionBefore(EstadoCola.EN_PROCESO, threshold);

        for (ColaPlanificacion item : colgados) {
            log.warn("Timeout: item {} en EN_PROCESO desde {} (> {} min)", item.getId(), item.getFechaCreacion(), TIMEOUT_MINUTOS);
            item.setEstado(EstadoCola.FALLIDO);
            item.setError("Timeout por crash");
            item.setFechaProcesado(OffsetDateTime.now());
            colaRepository.save(item);

            equipajeRepository.findById(item.getEquipajeId()).ifPresent(eq -> {
                if (item.getTipo() == TipoCola.REPLANIFICACION) {
                    eq.setEstado(EstadoEquipaje.EN_ALMACEN);
                } else {
                    eq.setEstado(EstadoEquipaje.INCUMPLIMIENTO_SLA);
                }
                equipajeRepository.save(eq);
            });

            notificarSse(item, null, null, false, "Timeout por crash");
        }
    }
}
