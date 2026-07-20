package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.application.OcupacionNodoService;
import com.tasfb2b.backend.bc1.domain.*;
import com.tasfb2b.backend.bc1.infrastructure.*;
import com.tasfb2b.backend.bc2.domain.SesionEjecucion;
import com.tasfb2b.backend.bc2.infrastructure.SesionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class SimulacionEnrutamientoService {

    private static final Logger log = LoggerFactory.getLogger(SimulacionEnrutamientoService.class);
    private static final int SUB_BATCH_SIZE = 2000;

    /** Máximo equipajes a procesar en un solo ciclo del planificador.
     *  Evita que el planificador bloquee el tick por minutos procesando
     *  millones de equipajes atrasados en una sola transacción. */
    private static final int MAX_EQUIPAJES_PER_CYCLE = 2_500;

    /** Último diagnóstico de ventana por sesión, para telemetría WebSocket. */
    private final ConcurrentHashMap<UUID, VentanaDiagnostico> ultimoDiagnostico = new ConcurrentHashMap<>();

    private final JdbcTemplate jdbcTemplate;
    private final MotorEnrutamiento motorEnrutamiento;
    private final NodoLogisticoRepository nodoRepository;
    private final VueloRepository vueloRepository;
    private final PlanViajeRepository planViajeRepository;
    private final SegmentoPlanRepository segmentoPlanRepository;
    private final OcupacionNodoService ocupacionNodoService;
    private final SesionRepository sesionRepository;

    public SimulacionEnrutamientoService(JdbcTemplate jdbcTemplate,
                                         MotorEnrutamiento motorEnrutamiento,
                                         NodoLogisticoRepository nodoRepository,
                                         VueloRepository vueloRepository,
                                         PlanViajeRepository planViajeRepository,
                                         SegmentoPlanRepository segmentoPlanRepository,
                                         OcupacionNodoService ocupacionNodoService,
                                         SesionRepository sesionRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.motorEnrutamiento = motorEnrutamiento;
        this.nodoRepository = nodoRepository;
        this.vueloRepository = vueloRepository;
        this.planViajeRepository = planViajeRepository;
        this.segmentoPlanRepository = segmentoPlanRepository;
        this.ocupacionNodoService = ocupacionNodoService;
        this.sesionRepository = sesionRepository;
    }

    @Transactional
    public ResultadoVentana enrutarVentana(UUID sesionId, OffsetDateTime inicioVentana, OffsetDateTime finVentana) {
        SesionEjecucion sesion = sesionRepository.findById(sesionId).orElse(null);
        OffsetDateTime filtroDesde = sesion != null ? sesion.getFechaFiltroDesde() : null;
        OffsetDateTime filtroHasta = sesion != null ? sesion.getFechaFiltroHasta() : null;
        boolean filtrar = filtroDesde != null && filtroHasta != null;

        String sqlBacklogBase =
                "SELECT id, origen_iata, destino_iata, sla_comprometido, cantidad, fecha_ingreso, fecha_operacion " +
                        "FROM equipajes " +
                        "WHERE estado = 'REGISTRADO' AND fecha_operacion < ? " +
                        (filtrar ? "AND fecha_operacion BETWEEN ? AND ? " : "") +
                        "ORDER BY fecha_operacion LIMIT ?";
        Object[] argsBacklog = filtrar
                ? new Object[]{inicioVentana, filtroDesde, filtroHasta, MAX_EQUIPAJES_PER_CYCLE}
                : new Object[]{inicioVentana, MAX_EQUIPAJES_PER_CYCLE};

        List<Equipaje> backlog = jdbcTemplate.query(sqlBacklogBase, this::mapEquipaje, argsBacklog);

        int remaining = MAX_EQUIPAJES_PER_CYCLE - backlog.size();
        List<Equipaje> window = Collections.emptyList();
        if (remaining > 0) {
            String sqlWindow =
                    "SELECT id, origen_iata, destino_iata, sla_comprometido, cantidad, fecha_ingreso, fecha_operacion " +
                            "FROM equipajes " +
                            "WHERE estado = 'REGISTRADO' AND fecha_operacion >= ? AND fecha_operacion < ? " +
                            (filtrar ? "AND fecha_operacion BETWEEN ? AND ? " : "") +
                            "ORDER BY fecha_operacion LIMIT ?";
            Object[] argsWindow = filtrar
                    ? new Object[]{inicioVentana, finVentana, filtroDesde, filtroHasta, remaining}
                    : new Object[]{inicioVentana, finVentana, remaining};
            window = jdbcTemplate.query(sqlWindow, this::mapEquipaje, argsWindow);
        }

        if (!backlog.isEmpty()) {
            log.info("Backlog: {} equipajes atrasados en ventana {}-{}", backlog.size(), inicioVentana, finVentana);
        }

        List<Equipaje> equipajes = new ArrayList<>(backlog.size() + window.size());
        equipajes.addAll(backlog);
        equipajes.addAll(window);

        if (equipajes.isEmpty()) {
            log.info("VENTANA [{}-{}]: 0 equipajes REGISTRADOS en ventana virtual",
                    inicioVentana, finVentana);
            return new ResultadoVentana(0, false, null, null, List.of());
        }

        // Diagnostic log + telemetría: verify equipaje dates match virtual window
        OffsetDateTime minFecha = equipajes.get(0).getFechaOperacion();
        OffsetDateTime maxFecha = equipajes.get(equipajes.size() - 1).getFechaOperacion();
        ultimoDiagnostico.put(sesionId, new VentanaDiagnostico(
                inicioVentana, finVentana, backlog.size(), window.size(), equipajes.size(), minFecha, maxFecha));
        log.info("VENTANA [{}-{}]: backlog={} window={} total={} | fecha_op min={} max={}",
                inicioVentana, finVentana, backlog.size(), window.size(), equipajes.size(),
                minFecha, maxFecha);

        int muestra = Math.min(3, equipajes.size());
        for (int s = 0; s < muestra; s++) {
            Equipaje e = equipajes.get(s);
            log.debug("VENTANA muestra[{}]: id={} fecha_op={} sla={} ruta={}->{} cant={}",
                    s, e.getId(), e.getFechaOperacion(), e.getSlaComprometido(),
                    e.getOrigenIata(), e.getDestinoIata(), e.getCantidad());
        }

        // Cargar vuelos programados UNA SOLA VEZ para todos los sub-lotes
        List<Vuelo> programados = vueloRepository.findByEstadoAndEsPlantilla(
                EstadoVuelo.PROGRAMADO, false, Pageable.unpaged()).getContent();
        Map<UUID, Vuelo> vuelosMap = programados.stream()
                .collect(Collectors.toMap(Vuelo::getId, v -> v));

        // Cargar nodos UNA SOLA VEZ
        List<NodoLogistico> todosNodos = nodoRepository.findAll();
        Map<String, NodoLogistico> nodosPorIata = todosNodos.stream()
                .collect(Collectors.toMap(NodoLogistico::getCodigoIata, n -> n));
        Map<UUID, NodoLogistico> nodosPorId = todosNodos.stream()
                .collect(Collectors.toMap(NodoLogistico::getId, n -> n));

        List<UUID> equipajesEnrutados = new ArrayList<>();
        List<UUID> todosEnrutados = new ArrayList<>();
        int enrutados = 0;
        int sinRutaTotal = 0;
        UUID primerSinRutaGlobal = null;

        for (int i = 0; i < equipajes.size(); i += SUB_BATCH_SIZE) {
            List<Equipaje> subBatch = equipajes.subList(i, Math.min(i + SUB_BATCH_SIZE, equipajes.size()));
            List<RutaResult> resultados = motorEnrutamiento.calcularRutasLote(subBatch, programados, inicioVentana, nodosPorIata);

            List<PlanViaje> planesBatch = new ArrayList<>();
            List<SegmentoPlan> segmentosBatch = new ArrayList<>();
            Map<UUID, Integer> vuelosActualizar = new HashMap<>();
            Map<UUID, Integer> nodosActualizar = new HashMap<>();

            int sinRutaLote = 0;
            UUID primerSinRutaLote = null;
            for (int j = 0; j < subBatch.size(); j++) {
                Equipaje eq = subBatch.get(j);
                RutaResult ruta = (j < resultados.size()) ? resultados.get(j) : null;

                if (ruta == null || !ruta.exitoso() || ruta.segmentos().isEmpty()) {
                    log.debug("SinRuta: equipaje {} en ventana {}-{}", eq.getId(), inicioVentana, finVentana);
                    sinRutaLote++;
                    if (primerSinRutaLote == null) primerSinRutaLote = eq.getId();
                    continue;
                }

                PlanViaje planViaje = new PlanViaje();
                planViaje.setId(UUID.randomUUID());
                planViaje.setEquipaje(eq);
                planViaje.setEstadoSla(EstadoSla.EN_TIEMPO);
                planViaje.setSesionId(sesionId);
                planViaje.setTiempoEntregaEst(
                        ruta.segmentos().get(ruta.segmentos().size() - 1).horaLlegada());
                planViaje.setSegmentos(new ArrayList<>());

                SegmentoInfo primerSeg = ruta.segmentos().get(0);
                Vuelo primerVuelo = vuelosMap.get(primerSeg.vueloId());
                if (primerVuelo != null) {
                    planViaje.setUbicacionTipo(UbicacionTipo.VUELO);
                    planViaje.setUbicacionId(primerVuelo.getId());
                    planViaje.setUbicacionLat(primerVuelo.getOrigenLat());
                    planViaje.setUbicacionLon(primerVuelo.getOrigenLon());
                }

                boolean segmentoValido = true;
                for (SegmentoInfo segInfo : ruta.segmentos()) {
                    Vuelo segVuelo = vuelosMap.get(segInfo.vueloId());
                    if (segVuelo == null) {
                        log.debug("SinRuta (vuelo no encontrado): equipaje {} en ventana {}-{}",
                                eq.getId(), inicioVentana, finVentana);
                        sinRutaLote++;
                        if (primerSinRutaLote == null) primerSinRutaLote = eq.getId();
                        segmentoValido = false;
                        break;
                    }
                    NodoLogistico segOrigen = nodosPorId.get(segInfo.nodoOrigenId());
                    NodoLogistico segDestino = nodosPorId.get(segInfo.nodoDestinoId());

                    SegmentoPlan segmento = new SegmentoPlan();
                    segmento.setId(UUID.randomUUID());
                    segmento.setPlanViaje(planViaje);
                    segmento.setVuelo(segVuelo);
                    segmento.setNodoOrigen(segOrigen);
                    segmento.setNodoDestino(segDestino);
                    segmento.setOrden(segInfo.orden());
                    segmento.setHoraSalidaProg(segInfo.horaSalida());
                    segmento.setEstado(EstadoSegmento.PENDIENTE);
                    segmentosBatch.add(segmento);
                }
                if (!segmentoValido) continue;

                planesBatch.add(planViaje);
                equipajesEnrutados.add(eq.getId());
                todosEnrutados.add(eq.getId());
                enrutados++;

                int cantidad = eq.getCantidad() != null ? eq.getCantidad() : 1;
                for (SegmentoInfo segInfo : ruta.segmentos()) {
                    Vuelo segVuelo = vuelosMap.get(segInfo.vueloId());
                    if (segVuelo != null) {
                        vuelosActualizar.merge(segVuelo.getId(), cantidad, Integer::sum);
                    }
                }
                nodosActualizar.merge(primerSeg.nodoOrigenId(), cantidad, Integer::sum);
            }

            if (sinRutaLote > 0) {
                log.warn("SinRuta: {} equipajes sin ruta en ventana {}-{} (primero: {})",
                        sinRutaLote, inicioVentana, finVentana, primerSinRutaLote);
            }

            // Defensa anti duplicate-key: borra cualquier plan/segmento PREVIO de las maletas
            // que vamos a enrutar. planes_viaje tiene UNIQUE(equipaje_id); el deshacer de arriba
            // solo limpia planes con el sesion_id de esta sesion, asi que un plan huerfano
            // (p.ej. sesion_id=NULL dejado por el worker dia a dia, o de una corrida previa)
            // haria reventar el insert. Mismo patron que PlanificacionWorker.
            eliminarPlanesPrevios(planesBatch.stream()
                    .map(p -> p.getEquipaje().getId()).toList());

            // Guardar todo en lote
            planViajeRepository.saveAll(planesBatch);
            segmentoPlanRepository.saveAll(segmentosBatch);

            // Batch updates con JDBC
            batchActualizarVuelos(vuelosActualizar);
            // Ocupación de origen sube al reservar la maleta, en el contexto de ESTA sesión.
            ocupacionNodoService.ajustarLote(nodosActualizar, sesionId);
            batchMarcarEnrutados(equipajesEnrutados);
            equipajesEnrutados.clear();
            sinRutaTotal += sinRutaLote;
            if (primerSinRutaLote != null && primerSinRutaGlobal == null) primerSinRutaGlobal = primerSinRutaLote;
        }

        boolean colapso = (sinRutaTotal > 0 && enrutados == 0);
        if (colapso) {
            log.warn("Colapso: 0 equipajes enrutados en ventana {}-{} ({} sin ruta)",
                    inicioVentana, finVentana, sinRutaTotal);
        }
        return new ResultadoVentana(enrutados, colapso, colapso ? inicioVentana : null,
                colapso ? primerSinRutaGlobal : null, todosEnrutados);
    }

    /** Borra plan_viaje + segmentos_plan preexistentes de las maletas dadas (anti duplicate-key).
     *  Antes de borrar, restaura carga_disponible en todos los vuelos que tenían capacidad reservada. */
    private void eliminarPlanesPrevios(List<UUID> equipajeIds) {
        if (equipajeIds == null || equipajeIds.isEmpty()) return;
        UUID[] idArray = equipajeIds.toArray(new UUID[0]);

        // Restaurar capacidad en todos los vuelos de los segmentos existentes
        List<Object[]> vuelos = jdbcTemplate.query(
            "SELECT sp.vuelo_id, SUM(COALESCE(eq.cantidad, 1)) AS total " +
            "FROM segmentos_plan sp " +
            "JOIN planes_viaje pv ON pv.id = sp.plan_viaje_id " +
            "JOIN equipajes eq ON eq.id = pv.equipaje_id " +
            "WHERE pv.equipaje_id = ANY(?) " +
            "GROUP BY sp.vuelo_id",
            (java.sql.ResultSet rs, int rowNum) -> new Object[]{
                rs.getObject("vuelo_id", UUID.class),
                rs.getInt("total")
            },
            (Object) idArray);
        for (Object[] fila : vuelos) {
            jdbcTemplate.update(
                "UPDATE vuelos SET carga_disponible = carga_disponible + ? WHERE id = ?",
                fila[1], fila[0]);
        }

        jdbcTemplate.update(
                "DELETE FROM segmentos_plan WHERE plan_viaje_id IN " +
                "(SELECT id FROM planes_viaje WHERE equipaje_id = ANY(?))", (Object) idArray);
        jdbcTemplate.update(
                "DELETE FROM planes_viaje WHERE equipaje_id = ANY(?)", (Object) idArray);
    }

    private void batchActualizarVuelos(Map<UUID, Integer> vuelosMap) {
        if (vuelosMap.isEmpty()) return;
        List<UUID> vueloIds = new ArrayList<>(vuelosMap.keySet());
        List<Integer> cantidades = new ArrayList<>(vuelosMap.values());
        jdbcTemplate.batchUpdate(
                "UPDATE vuelos SET carga_disponible = carga_disponible - ? WHERE id = ?",
                new BatchPreparedStatementSetter() {
                    public void setValues(PreparedStatement ps, int i) throws SQLException {
                        ps.setInt(1, cantidades.get(i));
                        ps.setObject(2, vueloIds.get(i));
                    }
                    public int getBatchSize() { return vueloIds.size(); }
                });
    }

    private void batchMarcarEnrutados(List<UUID> equipajeIds) {
        if (equipajeIds.isEmpty()) return;
        jdbcTemplate.batchUpdate(
                "UPDATE equipajes SET estado = 'ENRUTADO' WHERE id = ?",
                new BatchPreparedStatementSetter() {
                    public void setValues(PreparedStatement ps, int i) throws SQLException {
                        ps.setObject(1, equipajeIds.get(i));
                    }
                    public int getBatchSize() { return equipajeIds.size(); }
                });
    }

    private Equipaje mapEquipaje(ResultSet rs, int rowNum) throws SQLException {
        Equipaje eq = new Equipaje();
        eq.setId(UUID.fromString(rs.getString("id")));
        eq.setOrigenIata(rs.getString("origen_iata"));
        eq.setDestinoIata(rs.getString("destino_iata"));
        Timestamp slaTs = rs.getTimestamp("sla_comprometido");
        if (slaTs != null) {
            eq.setSlaComprometido(OffsetDateTime.ofInstant(slaTs.toInstant(), ZoneOffset.UTC));
        }
        Timestamp ingTs = rs.getTimestamp("fecha_ingreso");
        if (ingTs != null) {
            eq.setFechaIngreso(OffsetDateTime.ofInstant(ingTs.toInstant(), ZoneOffset.UTC));
        }
        Timestamp opTs = rs.getTimestamp("fecha_operacion");
        if (opTs != null) {
            eq.setFechaOperacion(OffsetDateTime.ofInstant(opTs.toInstant(), ZoneOffset.UTC));
        }
        eq.setCantidad(1);
        return eq;
    }

    public record ResultadoVentana(
            int enrutados,
            boolean colapso,
            OffsetDateTime momentoColapso,
            UUID equipajeColapsoId,
            List<UUID> equipajesEnrutados
    ) {}

    public record VentanaDiagnostico(
            OffsetDateTime inicioVentana,
            OffsetDateTime finVentana,
            int backlog,
            int window,
            int total,
            OffsetDateTime minFechaOp,
            OffsetDateTime maxFechaOp
    ) {}

    public VentanaDiagnostico obtenerUltimoDiagnostico(UUID sesionId) {
        return ultimoDiagnostico.get(sesionId);
    }
}
