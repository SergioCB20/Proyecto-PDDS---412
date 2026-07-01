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
import java.util.ArrayList;
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
    private final MaletaRepository maletaRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final RedisCacheService redisCacheService;

    public EquipajeService(EquipajeRepository equipajeRepository, PlanViajeRepository planViajeRepository,
                           SegmentoPlanRepository segmentoPlanRepository, VueloRepository vueloRepository,
                           NodoLogisticoRepository nodoRepository,
                           ColaPlanificacionRepository colaRepository,
                           MaletaRepository maletaRepository,
                           ApplicationEventPublisher eventPublisher,
                           RedisCacheService redisCacheService) {
        this.equipajeRepository = equipajeRepository;
        this.planViajeRepository = planViajeRepository;
        this.segmentoPlanRepository = segmentoPlanRepository;
        this.vueloRepository = vueloRepository;
        this.nodoRepository = nodoRepository;
        this.colaRepository = colaRepository;
        this.maletaRepository = maletaRepository;
        this.eventPublisher = eventPublisher;
        this.redisCacheService = redisCacheService;
    }

    public record RegistrarEquipajeRequest(
            String id_equipaje,
            String destino_iata,
            Integer cantidad,
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
            String origen_iata,
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

    public record MaletaResponse(
            UUID id,
            String codigo_maleta,
            UUID equipaje_id,
            String equipaje_id_externo,
            OffsetDateTime created_at
    ) {}

    @Transactional
    public EquipajeRegistradoResponse registrar(UUID operadorNodoId, RegistrarEquipajeRequest request) {
        NodoLogistico nodoOrigen = nodoRepository.findById(operadorNodoId)
                .orElseThrow(() -> new ValidacionException("Nodo asignado al operador no encontrado"));

        NodoLogistico nodoDestino = nodoRepository.findByCodigoIata(request.destino_iata())
                .orElseThrow(() -> new ValidacionException("Destino IATA no existe: " + request.destino_iata()));

        if (nodoOrigen.getOcupacionActual() >= nodoOrigen.getCapacidadAlmacen()) {
            throw new ValidacionException("Capacidad del almacen superada en nodo " + nodoOrigen.getCodigoIata());
        }

        int cantidad = request.cantidad() != null ? request.cantidad() : 1;
        if (cantidad < 1) {
            throw new ValidacionException("La cantidad debe ser al menos 1");
        }

        Equipaje equipaje = new Equipaje();
        equipaje.setId(UUID.randomUUID());
        String idExterno = request.id_equipaje();
        if (idExterno == null || idExterno.isBlank()) {
            idExterno = "ENV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }
        equipaje.setIdExterno(idExterno);
        equipaje.setOrigenIata(nodoOrigen.getCodigoIata());
        equipaje.setDestinoIata(request.destino_iata());
        equipaje.setCantidad(cantidad);
        OffsetDateTime sla = request.sla_comprometido();
        if (sla == null) {
            boolean mismoContinente = nodoOrigen.getContinente() != null
                    && nodoOrigen.getContinente().equals(nodoDestino.getContinente());
            sla = OffsetDateTime.now().plusHours(mismoContinente ? 24 : 48);
        }
        equipaje.setSlaComprometido(sla);
        equipaje.setFechaIngreso(OffsetDateTime.now());
        equipaje.setEstado(EstadoEquipaje.REGISTRADO);
        equipaje.setVueloActual(null);
        equipajeRepository.save(equipaje);

        // Crear N maletas individuales (una por unidad de `cantidad`).
        // Cada maleta tiene su propio codigo_maleta UNIQUE para trazabilidad.
        generarMaletasPara(equipaje);

        eventPublisher.publishEvent(new EquipajeIngresadoEvent(equipaje.getId(), OffsetDateTime.now()));

        ColaPlanificacion colaItem = new ColaPlanificacion();
        colaItem.setId(UUID.randomUUID());
        colaItem.setEquipajeId(equipaje.getId());
        colaItem.setTipo(TipoCola.PLANIFICACION);
        colaItem.setEstado(EstadoCola.PENDIENTE);
        colaItem.setIntentos(0);
        colaItem.setFechaCreacion(OffsetDateTime.now());
        colaItem.setSlaComprometido(sla);
        colaRepository.save(colaItem);

        return new EquipajeRegistradoResponse(
                equipaje.getId(),
                equipaje.getEstado().name(),
                equipaje.getIdExterno(),
                equipaje.getOrigenIata(),
                equipaje.getDestinoIata()
        );
    }

    @Transactional
    public EquipajeResponse actualizar(UUID id, RegistrarEquipajeRequest request) {
        Equipaje equipaje = equipajeRepository.findById(id)
                .orElseThrow(() -> new EquipajeNoEncontradoException("Equipaje no encontrado: " + id));

        nodoRepository.findByCodigoIata(request.destino_iata())
                .orElseThrow(() -> new ValidacionException("Destino IATA no existe"));

        equipaje.setDestinoIata(request.destino_iata());
        if (request.sla_comprometido() != null) {
            equipaje.setSlaComprometido(request.sla_comprometido());
        }
        if (request.cantidad() != null) {
            equipaje.setCantidad(request.cantidad());
        }
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
            int cantidad = equipaje.getCantidad() != null ? equipaje.getCantidad() : 1;
            vuelo.setCargaDisponible(vuelo.getCargaDisponible() + cantidad);
            vueloRepository.save(vuelo);
        }

        // Las maletas hijas se eliminan en cascada via FK ON DELETE CASCADE.
        equipajeRepository.delete(equipaje);
    }

    /**
     * Persiste N {@link Maleta} con codigo_maleta UNIQUE derivado del id_externo del
     * equipaje, formato "MAL-{id_externo}-NN" donde NN es el ordinal dentro del envio.
     * Pensada para llamarse justo despues de persistir el equipaje para que cada
     * registro padre tenga sus N hijas-maleta con identificadores trazables
     * individualmente.
     */
    public void generarMaletasPara(Equipaje equipaje) {
        int cantidad = equipaje.getCantidad() != null ? equipaje.getCantidad() : 1;
        if (cantidad <= 0) return;

        String idExternoEquipaje = equipaje.getIdExterno() != null
                ? equipaje.getIdExterno()
                : equipaje.getId().toString().substring(0, 8);
        // Limitar el prefijo a 20 caracteres para caber en VARCHAR(50) sumando "MAL-" (4) + "-" (1) + "NN" (>=2)
        String prefijo = idExternoEquipaje.length() > 20
                ? idExternoEquipaje.substring(0, 20)
                : idExternoEquipaje;
        int ancho = String.valueOf(cantidad).length();

        OffsetDateTime ahora = OffsetDateTime.now();
        List<Maleta> maletas = new ArrayList<>(cantidad);
        for (int i = 1; i <= cantidad; i++) {
            String codigo = String.format("MAL-%s-%0" + ancho + "d", prefijo, i);
            // Salvaguarda contra colision por truncamiento del prefijo:
            // si choca con uno existente, recorta un caracter y vuelve a intentar.
            int intentos = 0;
            while (maletaRepository.existsByCodigoMaleta(codigo) && intentos < 5) {
                prefijo = prefijo.length() > 1 ? prefijo.substring(0, prefijo.length() - 1) : prefijo;
                ancho = ancho + 1;
                codigo = String.format("MAL-%s-%0" + ancho + "d", prefijo, i);
                intentos++;
            }
            Maleta m = new Maleta(UUID.randomUUID(), codigo, equipaje, ahora);
            maletas.add(m);
        }
        maletaRepository.saveAll(maletas);
    }

    public List<Maleta> listarMaletasEquipaje(UUID equipajeId) {
        return maletaRepository.findByEquipajeId(equipajeId);
    }

    public List<Maleta> listarMaletasVuelo(UUID vueloId) {
        // Un vuelo lleva maletas por dos vias que hay que unir:
        //  A) equipaje.vuelo_actual_id == vueloId (equipajes actualmente embarcados;
        //     se setea al despegar y se limpia al aterrizar/completarse, asi que
        //     PROGRAMADO/ATERRIZADO/COMPLETADO recientes pueden aparecer vacios por aqui).
        //  B) segmentos_plan.vuelo_id == vueloId (equipajes cuyo plan de viaje pasa
        //     por este vuelo en cualquier estado: PENDIENTE/EN_CURSO/COMPLETADO).
        // Solo unir (A)∪(B) garantiza que el modal del panel muestre las maletas
        // incluso de vuelos ya aterrizados o de planes no emitidos todavia.
        java.util.Set<UUID> equipajeIds = new java.util.LinkedHashSet<>();
        for (Equipaje eq : equipajeRepository.findByVueloActualId(vueloId)) {
            equipajeIds.add(eq.getId());
        }
        for (Equipaje eq : segmentoPlanRepository.findEquipajesByVueloId(vueloId)) {
            equipajeIds.add(eq.getId());
        }
        if (equipajeIds.isEmpty()) return List.of();
        return maletaRepository.findByEquipajeIdIn(new java.util.ArrayList<>(equipajeIds));
    }

    public Equipaje buscarPorIdExterno(String idExterno) {
        return equipajeRepository.findByIdExterno(idExterno).orElse(null);
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
            UUID id,
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

    public record EnvioPanelResponse(
            UUID equipaje_id,
            String origen_iata,
            String destino_iata,
            String codigo_vuelo,
            String estado,
            Integer cantidad
    ) {}

    public List<EnvioPanelResponse> obtenerEnviosPanel(String tipo, String origenIata, String destinoIata) {
        List<EstadoEquipaje> estados = switch (tipo) {
            case "planificados" -> List.of(EstadoEquipaje.ENRUTADO, EstadoEquipaje.EN_ALMACEN);
            case "en_vuelo" -> List.of(EstadoEquipaje.EN_VUELO);
            case "entregados" -> List.of(EstadoEquipaje.ENTREGADO);
            default -> throw new IllegalArgumentException("tipo inválido: " + tipo);
        };
        String o = (origenIata != null && !origenIata.isBlank()) ? origenIata : null;
        String d = (destinoIata != null && !destinoIata.isBlank()) ? destinoIata : null;
        List<Equipaje> equipajes = equipajeRepository.findEnviosPanel(estados, o, d, PageRequest.of(0, 100));
        return equipajes.stream()
                .map(e -> {
                    String codigoVuelo = "";
                    if (e.getEstado() == EstadoEquipaje.EN_VUELO && e.getVueloActual() != null) {
                        codigoVuelo = e.getVueloActual().getCodigoVuelo();
                    } else if (e.getEstado() == EstadoEquipaje.ENTREGADO && e.getPlanViaje() != null) {
                        codigoVuelo = e.getPlanViaje().getSegmentos().stream()
                                .filter(sp -> sp.getEstado() == EstadoSegmento.COMPLETADO)
                                .max(java.util.Comparator.comparingInt(sp -> sp.getOrden() != null ? sp.getOrden() : 0))
                                .map(sp -> sp.getVuelo() != null ? sp.getVuelo().getCodigoVuelo() : "")
                                .orElse("");
                    } else if (e.getPlanViaje() != null && e.getPlanViaje().getSegmentos() != null
                            && !e.getPlanViaje().getSegmentos().isEmpty()) {
                        var first = e.getPlanViaje().getSegmentos().iterator().next();
                        if (first.getVuelo() != null) {
                            codigoVuelo = first.getVuelo().getCodigoVuelo();
                        }
                    }
                    return new EnvioPanelResponse(
                            e.getId(),
                            e.getOrigenIata(),
                            e.getDestinoIata(),
                            codigoVuelo,
                            e.getEstado().name(),
                            e.getCantidad() != null ? e.getCantidad() : 1
                    );
                })
                .toList();
    }

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
                        e.getId(),
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
                        e.getId(),
                        e.getOrigenIata(),
                        e.getDestinoIata(),
                        e.getIdExterno() != null ? e.getIdExterno() : e.getId().toString(),
                        e.getCantidad() != null ? e.getCantidad() : 1
                ))
                .toList();
    }

    public List<EntregadoRecienteResponse> obtenerEntregadosRecientes(int horas, String desdeStr) {
        OffsetDateTime desde;
        if (desdeStr != null && !desdeStr.isBlank()) {
            desde = OffsetDateTime.parse(desdeStr);
        } else {
            desde = OffsetDateTime.now().minusHours(horas);
        }
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

    public MetricasOperacionResponse obtenerMetricasOperacion(String desdeStr) {
        if (desdeStr != null && !desdeStr.isBlank()) {
            OffsetDateTime desde = OffsetDateTime.parse(desdeStr);
            Map<String, Long> equipajePorEstado = equipajeRepository.countByEstadoGroupedDesde(desde)
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
            long total = equipajeRepository.countDesde(desde);

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

            return new MetricasOperacionResponse(
                    total, registrados, enVuelo, enAlmacen, entregados,
                    replanificacion, incumplimiento,
                    programados, enRuta, completados, cancelados
            );
        }

        try {
            String cached = redisCacheService.get(CACHE_KEY_METRICAS);
            if (cached != null) {
                return METRICA_MAPPER.readValue(cached, MetricasOperacionResponse.class);
            }
        } catch (Exception e) {
            // Redis miss or parse error — fall through to DB query
        }

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

        long total = equipajeRepository.count();

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