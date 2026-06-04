package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.*;
import com.tasfb2b.backend.bc1.infrastructure.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

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

    public ResultadoVentana enrutarVentana(UUID sesionId, OffsetDateTime inicioVentana, OffsetDateTime finVentana) {
        List<Equipaje> equipajes = jdbcTemplate.query(
                "SELECT id, origen_iata, destino_iata, sla_comprometido, cantidad " +
                        "FROM equipajes" +
                        " WHERE estado = 'REGISTRADO' AND fecha_operacion >= ? AND fecha_operacion < ? " +
                        "ORDER BY fecha_operacion",
                this::mapEquipaje,
                inicioVentana, finVentana);

        if (equipajes.isEmpty()) {
            return new ResultadoVentana(0, false, null, null);
        }

        int enrutados = 0;
        for (int i = 0; i < equipajes.size(); i += SUB_BATCH_SIZE) {
            List<Equipaje> subBatch = equipajes.subList(i, Math.min(i + SUB_BATCH_SIZE, equipajes.size()));
            List<RutaResult> resultados = motorEnrutamiento.calcularRutasLote(subBatch);

            for (int j = 0; j < subBatch.size(); j++) {
                Equipaje eq = subBatch.get(j);
                RutaResult ruta = (j < resultados.size()) ? resultados.get(j) : null;

                if (ruta == null || !ruta.exitoso() || ruta.segmentos().isEmpty()) {
                    log.warn("Colapso: equipaje {} sin ruta disponible en ventana {}-{}",
                            eq.getId(), inicioVentana, finVentana);
                    return new ResultadoVentana(enrutados, true, inicioVentana, eq.getId());
                }

                crearPlanViaje(eq, ruta, sesionId);
                marcarEnrutado(eq.getId());
                enrutados++;
            }
        }

        return new ResultadoVentana(enrutados, false, null, null);
    }

    private void marcarEnrutado(UUID equipajeId) {
        jdbcTemplate.update("UPDATE equipajes SET estado = 'ENRUTADO' WHERE id = ?", equipajeId);
    }

    @Transactional
    void crearPlanViaje(Equipaje equipaje, RutaResult ruta, UUID sesionId) {
        PlanViaje planViaje = new PlanViaje();
        planViaje.setId(UUID.randomUUID());
        planViaje.setEquipaje(equipaje);
        planViaje.setEstadoSla(EstadoSla.EN_TIEMPO);
        planViaje.setSesionId(sesionId);
        planViaje.setTiempoEntregaEst(ruta.segmentos().get(ruta.segmentos().size() - 1).horaLlegada());

        SegmentoInfo primerSeg = ruta.segmentos().get(0);
        Vuelo primerVuelo = vueloRepository.findById(primerSeg.vueloId()).orElse(null);
        if (primerVuelo != null) {
            planViaje.setUbicacionTipo(UbicacionTipo.VUELO);
            planViaje.setUbicacionId(primerVuelo.getId());
            planViaje.setUbicacionLat(primerVuelo.getOrigenLat());
            planViaje.setUbicacionLon(primerVuelo.getOrigenLon());
        }

        planViaje.setSegmentos(new ArrayList<>());
        planViajeRepository.save(planViaje);

        StringBuilder rutaLog = new StringBuilder();
        rutaLog.append("RUTA equipaje=").append(equipaje.getId())
                .append(" origen=").append(equipaje.getOrigenIata())
                .append(" destino=").append(equipaje.getDestinoIata())
                .append(" segmentos=");

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

            rutaLog.append(" [").append(segInfo.orden()).append("] ")
                    .append(segInfo.nodoOrigenIata()).append("->")
                    .append(segInfo.nodoDestinoIata())
                    .append(" (").append(segInfo.vueloCodigo()).append(" ")
                    .append(segInfo.horaSalida()).append(")");
        }

        log.info(rutaLog.toString());

        if (primerVuelo != null) {
            primerVuelo.setCargaDisponible(primerVuelo.getCargaDisponible() - 1);
            vueloRepository.save(primerVuelo);

            NodoLogistico origen = nodoRepository.findById(primerSeg.nodoOrigenId())
                    .orElse(null);
            if (origen != null) {
                origen.setOcupacionActual(origen.getOcupacionActual() + 1);
                nodoRepository.save(origen);
            }
        }
    }

    private Equipaje mapEquipaje(ResultSet rs, int rowNum) throws java.sql.SQLException {
        Equipaje eq = new Equipaje();
        eq.setId(UUID.fromString(rs.getString("id")));
        eq.setOrigenIata(rs.getString("origen_iata"));
        eq.setDestinoIata(rs.getString("destino_iata"));
        Timestamp slaTs = rs.getTimestamp("sla_comprometido");
        if (slaTs != null) {
            eq.setSlaComprometido(OffsetDateTime.ofInstant(slaTs.toInstant(), ZoneOffset.UTC));
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
