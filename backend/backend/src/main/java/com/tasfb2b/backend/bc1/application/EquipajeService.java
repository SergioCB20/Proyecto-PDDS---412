package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.domain.*;
import com.tasfb2b.backend.bc1.infrastructure.*;
import com.tasfb2b.backend.shared.events.EquipajeIngresadoEvent;
import com.tasfb2b.backend.shared.infrastructure.RedisCacheService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.PageRequest;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class EquipajeService {

    private final EquipajeRepository equipajeRepository;
    private final PlanViajeRepository planViajeRepository;
    private final SegmentoPlanRepository segmentoPlanRepository;
    private final VueloRepository vueloRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final ColaPlanificacionRepository colaRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final RedisCacheService redisCacheService;

    public EquipajeService(EquipajeRepository equipajeRepository, PlanViajeRepository planViajeRepository,
                           SegmentoPlanRepository segmentoPlanRepository, VueloRepository vueloRepository,
                           NodoLogisticoRepository nodoRepository,
                           ColaPlanificacionRepository colaRepository,
                           ApplicationEventPublisher eventPublisher,
                           RedisCacheService redisCacheService) {
        this.equipajeRepository = equipajeRepository;
        this.planViajeRepository = planViajeRepository;
        this.segmentoPlanRepository = segmentoPlanRepository;
        this.vueloRepository = vueloRepository;
        this.nodoRepository = nodoRepository;
        this.colaRepository = colaRepository;
        this.eventPublisher = eventPublisher;
        this.redisCacheService = redisCacheService;
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

    public record EquipajeRegistradoResponse(
            UUID id,
            String estado,
            String id_externo,
            String destino_iata
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
    public EquipajeRegistradoResponse registrar(UUID operadorNodoId, RegistrarEquipajeRequest request) {
        NodoLogistico nodoOrigen = nodoRepository.findById(operadorNodoId)
                .orElseThrow(() -> new ValidacionException("Nodo asignado al operador no encontrado"));

        nodoRepository.findByCodigoIata(request.destino_iata())
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
        equipaje.setOrigenIata(nodoOrigen.getCodigoIata());
        equipaje.setDestinoIata(request.destino_iata());
        equipaje.setSlaComprometido(request.sla_comprometido());
        equipaje.setFechaIngreso(OffsetDateTime.now());
        equipaje.setEstado(EstadoEquipaje.REGISTRADO);
        equipaje.setVueloActual(vuelo);
        equipajeRepository.save(equipaje);

        eventPublisher.publishEvent(new EquipajeIngresadoEvent(equipaje.getId(), OffsetDateTime.now()));

        ColaPlanificacion colaItem = new ColaPlanificacion();
        colaItem.setId(UUID.randomUUID());
        colaItem.setEquipajeId(equipaje.getId());
        colaItem.setTipo(TipoCola.PLANIFICACION);
        colaItem.setEstado(EstadoCola.PENDIENTE);
        colaItem.setIntentos(0);
        colaItem.setFechaCreacion(OffsetDateTime.now());
        colaItem.setSlaComprometido(request.sla_comprometido());
        colaRepository.save(colaItem);

        return new EquipajeRegistradoResponse(
                equipaje.getId(),
                equipaje.getEstado().name(),
                equipaje.getIdExterno(),
                equipaje.getDestinoIata()
        );
    }

    @Transactional
    public EquipajeResponse actualizar(UUID id, RegistrarEquipajeRequest request) {
        Equipaje equipaje = equipajeRepository.findById(id)
                .orElseThrow(() -> new EquipajeNoEncontradoException("Equipaje no encontrado: " + id));

        NodoLogistico nodoDestino = nodoRepository.findByCodigoIata(request.destino_iata())
                .orElseThrow(() -> new ValidacionException("Destino IATA no existe"));

        Vuelo vuelo = vueloRepository.findById(request.vuelo_id())
                .orElseThrow(() -> new ValidacionException("Vuelo no encontrado"));

        equipaje.setDestinoIata(request.destino_iata());
        equipaje.setSlaComprometido(request.sla_comprometido());
        equipaje.setVueloActual(vuelo);
        equipajeRepository.save(equipaje);

        PlanViaje planViaje = planViajeRepository.findByEquipajeId(id)
                .orElseThrow(() -> new ValidacionException("Plan de viaje no encontrado"));

        List<SegmentoPlan> segmentos = segmentoPlanRepository.findByPlanViajeIdOrderByOrdenAsc(planViaje.getId());
        return toEquipajeResponse(equipaje, planViaje, segmentos);
    }

    @Transactional
    public void eliminar(UUID id) {
        Equipaje equipaje = equipajeRepository.findById(id)
                .orElseThrow(() -> new EquipajeNoEncontradoException("Equipaje no encontrado: " + id));
        eliminarConEquipaje(equipaje);
    }

    @Transactional
    public void eliminarPorIdExterno(String idExterno) {
        Equipaje equipaje = equipajeRepository.findByIdExterno(idExterno)
                .orElseThrow(() -> new EquipajeNoEncontradoException("Equipaje no encontrado: " + idExterno));
        eliminarConEquipaje(equipaje);
    }

    private void eliminarConEquipaje(Equipaje equipaje) {
        UUID equipajeId = equipaje.getId();

        PlanViaje planViaje = planViajeRepository.findByEquipajeId(equipajeId)
                .orElseThrow(() -> new ValidacionException("Plan de viaje no encontrado"));

        List<SegmentoPlan> segmentos = segmentoPlanRepository.findByPlanViajeIdOrderByOrdenAsc(planViaje.getId());
        segmentoPlanRepository.deleteAll(segmentos);
        planViajeRepository.delete(planViaje);

        Vuelo vuelo = equipaje.getVueloActual();
        if (vuelo != null) {
            vuelo.setCargaDisponible(vuelo.getCargaDisponible() + 1);
            vueloRepository.save(vuelo);
        }

        equipajeRepository.delete(equipaje);
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

    public record EquipajeListItemResponse(
            UUID id,
            String id_externo,
            String estado,
            String origen_iata,
            String destino_iata,
            OffsetDateTime fecha_ingreso,
            Integer cantidad
    ) {}

    public record EnvioItemOperacionResponse(
            String origen_iata,
            String destino_iata,
            String codigo_equipaje,
            Integer cantidad
    ) {}

    public record EntregadoRecienteResponse(
            String origen_iata,
            String destino_iata,
            String codigo_vuelo,
            Integer cantidad
    ) {}

    public record MetricasOperacionResponse(
            long total_equipajes,
            long equipajes_registrados,
            long equipajes_en_vuelo,
            long equipajes_en_almacen,
            long equipajes_entregados,
            long equipajes_replanificacion,
            long equipajes_incumplimiento_sla,
            long vuelos_programados,
            long vuelos_en_ruta,
            long vuelos_completados,
            long vuelos_cancelados
    ) {}

    public List<EquipajeListItemResponse> listarEquipajes(String vueloId, String estado, int page, int size) {
        if (vueloId != null && !vueloId.isBlank()) {
            UUID vid = UUID.fromString(vueloId);
            List<Equipaje> equipajes = equipajeRepository.findByVueloActualId(vid);
            return equipajes.stream()
                    .map(e -> new EquipajeListItemResponse(
                            e.getId(), e.getIdExterno(), e.getEstado().name(),
                            e.getOrigenIata(), e.getDestinoIata(),
                            e.getFechaIngreso(), e.getCantidad()))
                    .toList();
        }
        if (estado != null && !estado.isBlank()) {
            EstadoEquipaje est = EstadoEquipaje.valueOf(estado);
            var result = equipajeRepository.findByEstado(est, PageRequest.of(page, size));
            return result.getContent().stream()
                    .map(e -> new EquipajeListItemResponse(
                            e.getId(), e.getIdExterno(), e.getEstado().name(),
                            e.getOrigenIata(), e.getDestinoIata(),
                            e.getFechaIngreso(), e.getCantidad()))
                    .toList();
        }
        var result = equipajeRepository.findAll(PageRequest.of(page, size));
        return result.getContent().stream()
                .map(e -> new EquipajeListItemResponse(
                        e.getId(), e.getIdExterno(), e.getEstado().name(),
                        e.getOrigenIata(), e.getDestinoIata(),
                        e.getFechaIngreso(), e.getCantidad()))
                .toList();
    }

    public List<EnvioItemOperacionResponse> obtenerEnviosVuelo(UUID vueloId) {
        List<Equipaje> equipajes = equipajeRepository.findByVueloActualId(vueloId);
        return equipajes.stream()
                .map(e -> new EnvioItemOperacionResponse(
                        e.getOrigenIata(),
                        e.getDestinoIata(),
                        e.getIdExterno() != null ? e.getIdExterno() : e.getId().toString(),
                        e.getCantidad() != null ? e.getCantidad() : 1
                ))
                .toList();
    }

    public List<EnvioItemOperacionResponse> obtenerEnviosNodo(String nodoIata) {
        List<Equipaje> enAlmacen = equipajeRepository.findByEstadoAndDestinoIata(EstadoEquipaje.EN_ALMACEN, nodoIata);
        List<Equipaje> origen = equipajeRepository.findByEstadoAndOrigenIata(EstadoEquipaje.REGISTRADO, nodoIata);

        java.util.Set<UUID> ids = new java.util.HashSet<>();
        java.util.List<Equipaje> result = new java.util.ArrayList<>();
        for (Equipaje e : enAlmacen) {
            if (ids.add(e.getId())) result.add(e);
        }
        for (Equipaje e : origen) {
            if (ids.add(e.getId())) result.add(e);
        }

        return result.stream()
                .map(e -> new EnvioItemOperacionResponse(
                        e.getOrigenIata(),
                        e.getDestinoIata(),
                        e.getIdExterno() != null ? e.getIdExterno() : e.getId().toString(),
                        e.getCantidad() != null ? e.getCantidad() : 1
                ))
                .toList();
    }

    public List<EntregadoRecienteResponse> obtenerEntregadosRecientes(int horas) {
        OffsetDateTime desde = OffsetDateTime.now().minusHours(horas);
        List<Equipaje> equipajes = equipajeRepository.findEntregadosRecientes(desde, PageRequest.of(0, 100));
        return equipajes.stream()
                .map(e -> {
                    String codigoVuelo = "";
                    if (e.getPlanViaje() != null && e.getPlanViaje().getSegmentos() != null) {
                        codigoVuelo = e.getPlanViaje().getSegmentos().stream()
                                .filter(sp -> sp.getEstado().name().equals("COMPLETADO"))
                                .max(java.util.Comparator.comparingInt(sp -> sp.getOrden() != null ? sp.getOrden() : 0))
                                .map(sp -> sp.getVuelo() != null ? sp.getVuelo().getCodigoVuelo() : "")
                                .orElse("");
                    }
                    return new EntregadoRecienteResponse(
                            e.getOrigenIata(),
                            e.getDestinoIata(),
                            codigoVuelo,
                            e.getCantidad() != null ? e.getCantidad() : 1
                    );
                })
                .toList();
    }

    private static final ObjectMapper METRICA_MAPPER = new ObjectMapper();
    private static final String CACHE_KEY_METRICAS = "metricas:operacion";
    private static final long CACHE_TTL_SECONDS = 5;

    public MetricasOperacionResponse obtenerMetricasOperacion() {
        try {
            String cached = redisCacheService.get(CACHE_KEY_METRICAS);
            if (cached != null) {
                return METRICA_MAPPER.readValue(cached, MetricasOperacionResponse.class);
            }
        } catch (Exception e) {
            // Redis miss or parse error — fall through to DB query
        }

        long total = equipajeRepository.count();

        Map<String, Long> equipajePorEstado = equipajeRepository.countByEstadoGrouped()
                .stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> (Long) row[1]
                ));

        long registrados = equipajePorEstado.getOrDefault("REGISTRADO", 0L);
        long enVuelo = equipajePorEstado.getOrDefault("EN_VUELO", 0L);
        long enAlmacen = equipajePorEstado.getOrDefault("EN_ALMACEN", 0L);
        long entregados = equipajePorEstado.getOrDefault("ENTREGADO", 0L);
        long replanificacion = equipajePorEstado.getOrDefault("EN_REPLANIFICACION", 0L);
        long incumplimiento = equipajePorEstado.getOrDefault("INCUMPLIMIENTO_SLA", 0L);

        Map<String, Long> vueloPorEstado = vueloRepository.countByEstadoNotPlantillaGrouped()
                .stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> (Long) row[1]
                ));

        long programados = vueloPorEstado.getOrDefault("PROGRAMADO", 0L);
        long enRuta = vueloPorEstado.getOrDefault("EN_RUTA", 0L);
        long completados = vueloPorEstado.getOrDefault("COMPLETADO", 0L);
        long cancelados = vueloPorEstado.getOrDefault("CANCELADO", 0L);

        MetricasOperacionResponse result = new MetricasOperacionResponse(
                total, registrados, enVuelo, enAlmacen, entregados,
                replanificacion, incumplimiento,
                programados, enRuta, completados, cancelados
        );

        try {
            redisCacheService.set(CACHE_KEY_METRICAS, METRICA_MAPPER.writeValueAsString(result), CACHE_TTL_SECONDS);
        } catch (Exception e) {
            // cache write failure is non-critical
        }

        return result;
    }

    public static class EquipajeNoEncontradoException extends RuntimeException {
        public EquipajeNoEncontradoException(String msg) { super(msg); }
    }

    public static class ValidacionException extends RuntimeException {
        public ValidacionException(String msg) { super(msg); }
    }
}