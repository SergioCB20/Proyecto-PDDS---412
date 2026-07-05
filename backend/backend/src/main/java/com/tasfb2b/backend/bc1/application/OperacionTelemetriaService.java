package com.tasfb2b.backend.bc1.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import com.tasfb2b.backend.bc2.infrastructure.TelemetriaWebSocket;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class OperacionTelemetriaService {

    private static final Logger log = LoggerFactory.getLogger(OperacionTelemetriaService.class);
    private static final LocalDate FECHA_OPERACION = LocalDate.of(2026, 1, 15);

    private static final double NODO_VERDE_MAX = 70.0;
    private static final double NODO_AMBAR_MAX = 90.0;
    private static final double VUELO_VERDE_MAX = 70.0;
    private static final double VUELO_AMBAR_MAX = 90.0;

    private final NodoLogisticoRepository nodoRepository;
    private final VueloRepository vueloRepository;
    private final TelemetriaWebSocket telemetriaWebSocket;
    private final OcupacionNodoService ocupacionNodoService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OperacionTelemetriaService(NodoLogisticoRepository nodoRepository,
                                       VueloRepository vueloRepository,
                                       TelemetriaWebSocket telemetriaWebSocket,
                                       OcupacionNodoService ocupacionNodoService) {
        this.nodoRepository = nodoRepository;
        this.vueloRepository = vueloRepository;
        this.telemetriaWebSocket = telemetriaWebSocket;
        this.ocupacionNodoService = ocupacionNodoService;
    }

    @Async
    public void emitirTelemetria() {
        try {
            List<NodoLogistico> nodos = nodoRepository.findAllByOrderByCodigoIataAsc();
            LocalDate hoy = FECHA_OPERACION;
            List<Vuelo> vuelos = vueloRepository.findByEstadoInAndEsPlantillaAndFechaOperacion(
                    List.of(EstadoVuelo.PROGRAMADO, EstadoVuelo.EN_RUTA, EstadoVuelo.COMPLETADO), false, hoy);
            String json = buildTelemetryJson(nodos, vuelos);
            telemetriaWebSocket.broadcast(json);
        } catch (Exception e) {
            log.warn("Error emitting operational telemetry: {}", e.getMessage());
        }
    }

    private String buildTelemetryJson(List<NodoLogistico> nodos, List<Vuelo> vuelos) {
        OffsetDateTime now = OffsetDateTime.now();
        ObjectNode root = objectMapper.createObjectNode();
        root.put("timestamp", now.toString());

        // Ocupación del contexto de la operación día a día (no el contador global compartido).
        java.util.Map<java.util.UUID, Integer> ocupacion = ocupacionNodoService.mapa(OcupacionNodoService.OPERACION);
        ArrayNode nodosArr = root.putArray("nodos");
        for (NodoLogistico nodo : nodos) {
            ObjectNode n = nodosArr.addObject();
            n.put("id", nodo.getId().toString());
            n.put("codigo_iata", nodo.getCodigoIata());
            n.put("lat", nodo.getLatitud().doubleValue());
            n.put("lon", nodo.getLongitud().doubleValue());
            int cap = nodo.getCapacidadAlmacen() != null ? nodo.getCapacidadAlmacen() : 0;
            int occ = ocupacion.getOrDefault(nodo.getId(), 0);
            n.put("capacidad_almacen", cap);
            n.put("ocupacion_actual", occ);
            double pct = cap > 0 ? (occ * 100.0) / cap : 0.0;
            n.put("ocupacion_pct", Math.round(pct * 100.0) / 100.0);
            n.put("color", evaluarColorNodo(pct));
            n.put("continente", nodo.getContinente() != null ? nodo.getContinente() : "");
            n.put("zona_horaria", nodo.getZonaHoraria() != null ? nodo.getZonaHoraria() : "");
        }

        ArrayNode vuelosArr = root.putArray("vuelos");
        for (Vuelo vuelo : vuelos) {
            ObjectNode v = vuelosArr.addObject();
            v.put("id", vuelo.getId().toString());
            v.put("codigo_vuelo", vuelo.getCodigoVuelo());
            v.put("estado", vuelo.getEstado().name());
            v.put("origen_lat", vuelo.getOrigenLat().doubleValue());
            v.put("origen_lon", vuelo.getOrigenLon().doubleValue());
            v.put("destino_lat", vuelo.getDestinoLat().doubleValue());
            v.put("destino_lon", vuelo.getDestinoLon().doubleValue());
            v.put("origen_iata", vuelo.getOrigen().getCodigoIata());
            v.put("destino_iata", vuelo.getDestino().getCodigoIata());

            if (vuelo.getEstado() == EstadoVuelo.EN_RUTA) {
                double t = Math.min(Math.max(calcularProgreso(vuelo, now), 0.0), 1.0);
                double[] pos = bezierPosition(
                        vuelo.getOrigenLat().doubleValue(), vuelo.getOrigenLon().doubleValue(),
                        vuelo.getDestinoLat().doubleValue(), vuelo.getDestinoLon().doubleValue(), t);
                v.put("lat_actual", Math.round(pos[0] * 1_000_000.0) / 1_000_000.0);
                v.put("lon_actual", Math.round(pos[1] * 1_000_000.0) / 1_000_000.0);
                v.put("progreso", Math.round(t * 1_000_000.0) / 1_000_000.0);
            } else {
                v.put("lat_actual", vuelo.getOrigenLat().doubleValue());
                v.put("lon_actual", vuelo.getOrigenLon().doubleValue());
                v.put("progreso", 0.0);
            }

            v.put("capacidad_carga", vuelo.getCapacidadCarga() != null ? vuelo.getCapacidadCarga() : 0);
            v.put("carga_disponible", vuelo.getCargaDisponible() != null ? vuelo.getCargaDisponible() : 0);
            double pctVuelo = vuelo.getOcupacionPorcentaje();
            v.put("ocupacion_pct", Math.round(pctVuelo * 100.0) / 100.0);
            v.put("color", evaluarColorVuelo(pctVuelo));
            v.put("hora_salida", vuelo.getHoraSalida() != null ? vuelo.getHoraSalida().toString() : "");
            v.put("hora_llegada", vuelo.getHoraLlegada() != null ? vuelo.getHoraLlegada().toString() : "");
        }

        ObjectNode metrics = root.putObject("metricas_sesion");
        metrics.put("k", 1.0);

        try {
            return objectMapper.writeValueAsString(root);
        } catch (JsonProcessingException e) {
            log.error("Error serializing operational telemetry JSON: {}", e.getMessage());
            return "{}";
        }
    }

    private double[] bezierPosition(double lat1, double lon1, double lat2, double lon2, double t) {
        double midLat = (lat1 + lat2) / 2.0;
        double midLon = (lon1 + lon2) / 2.0;
        double dLat = lat2 - lat1;
        double dLon = lon2 - lon1;
        double dist = Math.sqrt(dLat * dLat + dLon * dLon);
        double ctrlLat, ctrlLon;
        if (dist > 0) {
            double offset = Math.max(dist * 0.3, 0.5);
            ctrlLat = midLat + (dLon / dist) * offset;
            ctrlLon = midLon + (-dLat / dist) * offset;
        } else {
            ctrlLat = midLat;
            ctrlLon = midLon;
        }
        double t1 = 1 - t;
        return new double[]{
            t1 * t1 * lat1 + 2 * t1 * t * ctrlLat + t * t * lat2,
            t1 * t1 * lon1 + 2 * t1 * t * ctrlLon + t * t * lon2
        };
    }

    private double calcularProgreso(Vuelo vuelo, OffsetDateTime now) {
        if (vuelo.getHoraSalida() == null || vuelo.getHoraLlegada() == null) return 0;
        long total = Duration.between(vuelo.getHoraSalida(), vuelo.getHoraLlegada()).toMillis();
        if (total <= 0) return 1;
        long transcurrido = Duration.between(vuelo.getHoraSalida(), now).toMillis();
        return (double) transcurrido / total;
    }

    private static String evaluarColorNodo(double pct) {
        if (pct <= NODO_VERDE_MAX) return "VERDE";
        if (pct <= NODO_AMBAR_MAX) return "AMBAR";
        return "ROJO";
    }

    private static String evaluarColorVuelo(double pct) {
        if (pct <= VUELO_VERDE_MAX) return "VERDE";
        if (pct <= VUELO_AMBAR_MAX) return "AMBAR";
        return "ROJO";
    }
}
