package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.*;
import com.tasfb2b.backend.bc1.infrastructure.*;
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
import java.util.stream.Collectors;

@Service
public class SimulacionEnrutamientoService {

    private static final Logger log = LoggerFactory.getLogger(SimulacionEnrutamientoService.class);
    private static final int SUB_BATCH_SIZE = 2000;

    private final JdbcTemplate jdbcTemplate;
    private final MotorEnrutamiento motorEnrutamiento;
    private final NodoLogisticoRepository nodoRepository;
    private final VueloRepository vueloRepository;
    private final PlanViajeRepository planViajeRepository;
    private final SegmentoPlanRepository segmentoPlanRepository;

    public SimulacionEnrutamientoService(JdbcTemplate jdbcTemplate,
                                         MotorEnrutamiento motorEnrutamiento,
                                         NodoLogisticoRepository nodoRepository,
                                         VueloRepository vueloRepository,
                                         PlanViajeRepository planViajeRepository,
                                         SegmentoPlanRepository segmentoPlanRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.motorEnrutamiento = motorEnrutamiento;
        this.nodoRepository = nodoRepository;
        this.vueloRepository = vueloRepository;
        this.planViajeRepository = planViajeRepository;
        this.segmentoPlanRepository = segmentoPlanRepository;
    }

    @Transactional
    public ResultadoVentana enrutarVentana(UUID sesionId, OffsetDateTime inicioVentana, OffsetDateTime finVentana, long deltaDias) {
        OffsetDateTime inicioAjustado = inicioVentana.minusDays(deltaDias);
        OffsetDateTime finAjustado = finVentana.minusDays(deltaDias);

        List<Equipaje> backlog = jdbcTemplate.query(
                "SELECT id, origen_iata, destino_iata, sla_comprometido, cantidad, fecha_ingreso " +
                        "FROM equipajes" +
                        " WHERE estado = 'REGISTRADO' AND fecha_operacion < ? " +
                        "ORDER BY fecha_operacion",
                this::mapEquipaje,
                inicioAjustado);

        List<Equipaje> window = jdbcTemplate.query(
                "SELECT id, origen_iata, destino_iata, sla_comprometido, cantidad, fecha_ingreso " +
                        "FROM equipajes" +
                        " WHERE estado = 'REGISTRADO' AND fecha_operacion >= ? AND fecha_operacion < ? " +
                        "ORDER BY fecha_operacion",
                this::mapEquipaje,
                inicioAjustado, finAjustado);

        // Shift sla_comprometido by delta to match virtual time
        for (Equipaje e : backlog) {
            e.setSlaComprometido(e.getSlaComprometido().plusDays(deltaDias));
        }
        for (Equipaje e : window) {
            e.setSlaComprometido(e.getSlaComprometido().plusDays(deltaDias));
        }

        if (!backlog.isEmpty()) {
            log.info("Backlog: {} equipajes atrasados en ventana {}-{}", backlog.size(), inicioVentana, finVentana);
        }

        List<Equipaje> equipajes = new ArrayList<>(backlog.size() + window.size());
        equipajes.addAll(backlog);
        equipajes.addAll(window);

        if (equipajes.isEmpty()) {
            return new ResultadoVentana(0, false, null, null);
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
        int enrutados = 0;

        for (int i = 0; i < equipajes.size(); i += SUB_BATCH_SIZE) {
            List<Equipaje> subBatch = equipajes.subList(i, Math.min(i + SUB_BATCH_SIZE, equipajes.size()));
            List<RutaResult> resultados = motorEnrutamiento.calcularRutasLote(subBatch, programados, inicioVentana, nodosPorIata);

            List<PlanViaje> planesBatch = new ArrayList<>();
            List<SegmentoPlan> segmentosBatch = new ArrayList<>();
            List<UUID> vuelosActualizar = new ArrayList<>();
            Map<UUID, Integer> nodosActualizar = new HashMap<>();

            for (int j = 0; j < subBatch.size(); j++) {
                Equipaje eq = subBatch.get(j);
                RutaResult ruta = (j < resultados.size()) ? resultados.get(j) : null;

                if (ruta == null || !ruta.exitoso() || ruta.segmentos().isEmpty()) {
                    log.warn("Colapso: equipaje {} sin ruta disponible en ventana {}-{}",
                            eq.getId(), inicioVentana, finVentana);
                    return new ResultadoVentana(enrutados, true, inicioVentana, eq.getId());
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

                for (SegmentoInfo segInfo : ruta.segmentos()) {
                    Vuelo segVuelo = vuelosMap.get(segInfo.vueloId());
                    if (segVuelo == null) {
                        return new ResultadoVentana(enrutados, true, inicioVentana, eq.getId());
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

                planesBatch.add(planViaje);
                equipajesEnrutados.add(eq.getId());
                enrutados++;

                if (primerVuelo != null) {
                    vuelosActualizar.add(primerVuelo.getId());
                }
                int cantidad = eq.getCantidad() != null ? eq.getCantidad() : 1;
                nodosActualizar.merge(primerSeg.nodoOrigenId(), cantidad, Integer::sum);
            }

            // Guardar todo en lote
            planViajeRepository.saveAll(planesBatch);
            segmentoPlanRepository.saveAll(segmentosBatch);

            // Batch updates con JDBC
            batchActualizarVuelos(vuelosActualizar);
            batchActualizarNodos(nodosActualizar);
            batchMarcarEnrutados(equipajesEnrutados);
            equipajesEnrutados.clear();
        }

        return new ResultadoVentana(enrutados, false, null, null);
    }

    private void batchActualizarVuelos(List<UUID> vueloIds) {
        if (vueloIds.isEmpty()) return;
        jdbcTemplate.batchUpdate(
                "UPDATE vuelos SET carga_disponible = carga_disponible - 1 WHERE id = ?",
                new BatchPreparedStatementSetter() {
                    public void setValues(PreparedStatement ps, int i) throws SQLException {
                        ps.setObject(1, vueloIds.get(i));
                    }
                    public int getBatchSize() { return vueloIds.size(); }
                });
    }

    private void batchActualizarNodos(Map<UUID, Integer> nodosMap) {
        if (nodosMap.isEmpty()) return;
        List<UUID> nodoIds = new ArrayList<>(nodosMap.keySet());
        List<Integer> cantidades = new ArrayList<>(nodosMap.values());
        jdbcTemplate.batchUpdate(
                "UPDATE nodos_logisticos SET ocupacion_actual = ocupacion_actual + ? WHERE id = ?",
                new BatchPreparedStatementSetter() {
                    public void setValues(PreparedStatement ps, int i) throws SQLException {
                        ps.setInt(1, cantidades.get(i));
                        ps.setObject(2, nodoIds.get(i));
                    }
                    public int getBatchSize() { return nodoIds.size(); }
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
        eq.setCantidad(rs.getInt("cantidad"));
        return eq;
    }

    public record ResultadoVentana(
            int enrutados,
            boolean colapso,
            OffsetDateTime momentoColapso,
            UUID equipajeColapsoId
    ) {}
}
