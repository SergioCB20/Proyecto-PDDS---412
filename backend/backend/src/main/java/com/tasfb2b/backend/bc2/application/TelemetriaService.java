package com.tasfb2b.backend.bc2.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import com.tasfb2b.backend.bc2.domain.SesionEjecucion;
import com.tasfb2b.backend.bc2.domain.UmbralCapacidad;
import com.tasfb2b.backend.bc2.infrastructure.TelemetriaWebSocket;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;

@Service
public class TelemetriaService {

    private static final Logger log = LoggerFactory.getLogger(TelemetriaService.class);

    private final NodoLogisticoRepository nodoRepository;
    private final VueloRepository vueloRepository;
    private final TelemetriaWebSocket telemetriaWebSocket;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TelemetriaService(NodoLogisticoRepository nodoRepository,
                             VueloRepository vueloRepository,
                             TelemetriaWebSocket telemetriaWebSocket) {
        this.nodoRepository = nodoRepository;
        this.vueloRepository = vueloRepository;
        this.telemetriaWebSocket = telemetriaWebSocket;
    }

    public void emitirTelemetria(SesionEjecucion sesion) {
        try {
            String json = buildTelemetryJson(sesion);
            telemetriaWebSocket.broadcast(json);
        } catch (Exception e) {
            log.warn("Error emitting telemetry for session {}: {}", sesion.getId(), e.getMessage());
        }
    }

    private String buildTelemetryJson(SesionEjecucion sesion) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("timestamp", OffsetDateTime.now().toString());

        ArrayNode nodosArr = root.putArray("nodos");
        List<NodoLogistico> nodos = nodoRepository.findAllByOrderByCodigoIataAsc();
        for (NodoLogistico nodo : nodos) {
            ObjectNode n = nodosArr.addObject();
            n.put("id", nodo.getId().toString());
            n.put("codigo_iata", nodo.getCodigoIata());
            n.put("lat", nodo.getLatitud().doubleValue());
            n.put("lon", nodo.getLongitud().doubleValue());
            n.put("capacidad_almacen", nodo.getCapacidadAlmacen() != null ? nodo.getCapacidadAlmacen() : 0);
            n.put("ocupacion_actual", nodo.getOcupacionActual() != null ? nodo.getOcupacionActual() : 0);
            double pct = nodo.getOcupacionPorcentaje();
            n.put("ocupacion_pct", Math.round(pct * 100.0) / 100.0);
            n.put("color", evaluarColorNodo(pct, sesion));
            n.put("continente", nodo.getContinente() != null ? nodo.getContinente() : "");
            n.put("zona_horaria", nodo.getZonaHoraria() != null ? nodo.getZonaHoraria() : "");
        }

        ArrayNode vuelosArr = root.putArray("vuelos");
        List<Vuelo> vuelos = vueloRepository.findByEstadoInAndEsPlantilla(
                List.of(EstadoVuelo.PROGRAMADO, EstadoVuelo.EN_RUTA), false);

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

            if (vuelo.getEstado() == EstadoVuelo.EN_RUTA && sesion.getDiaHoraVirtual() != null) {
                double progress = calcularProgreso(vuelo, sesion.getDiaHoraVirtual());
                double lat = vuelo.getOrigenLat().doubleValue()
                        + (vuelo.getDestinoLat().doubleValue() - vuelo.getOrigenLat().doubleValue())
                        * Math.min(progress, 1.0);
                double lon = vuelo.getOrigenLon().doubleValue()
                        + (vuelo.getDestinoLon().doubleValue() - vuelo.getOrigenLon().doubleValue())
                        * Math.min(progress, 1.0);
                v.put("lat_actual", Math.round(lat * 1_000_000.0) / 1_000_000.0);
                v.put("lon_actual", Math.round(lon * 1_000_000.0) / 1_000_000.0);
            } else {
                v.put("lat_actual", vuelo.getOrigenLat().doubleValue());
                v.put("lon_actual", vuelo.getOrigenLon().doubleValue());
            }

            v.put("capacidad_carga", vuelo.getCapacidadCarga() != null ? vuelo.getCapacidadCarga() : 0);
            v.put("carga_disponible", vuelo.getCargaDisponible() != null ? vuelo.getCargaDisponible() : 0);
            double pctVuelo = vuelo.getOcupacionPorcentaje();
            v.put("ocupacion_pct", Math.round(pctVuelo * 100.0) / 100.0);
            v.put("color", evaluarColorVuelo(pctVuelo, sesion));
            v.put("hora_salida", vuelo.getHoraSalida() != null ? vuelo.getHoraSalida().toString() : "");
            v.put("hora_llegada", vuelo.getHoraLlegada() != null ? vuelo.getHoraLlegada().toString() : "");
        }

        ObjectNode metrics = root.putObject("metricas_sesion");
        metrics.put("sesion_id", sesion.getId().toString());
        metrics.put("estado", sesion.getEstado().name());
        metrics.put("dia_hora_virtual", sesion.getDiaHoraVirtual() != null
                ? sesion.getDiaHoraVirtual().toString() : "");
        metrics.put("segundos_reales_transcurridos",
                sesion.getSegundosRealesTranscurridos() != null ? sesion.getSegundosRealesTranscurridos() : 0);
        metrics.put("sla_acumulado_pct",
                sesion.getSlaAcumuladoPct() != null ? sesion.getSlaAcumuladoPct().doubleValue() : 100.0);
        metrics.put("vuelos_cancelados",
                sesion.getVuelosCancelados() != null ? sesion.getVuelosCancelados() : 0);
        metrics.put("maletas_replanificadas",
                sesion.getMaletasReplanificadas() != null ? sesion.getMaletasReplanificadas() : 0);

        try {
            return objectMapper.writeValueAsString(root);
        } catch (JsonProcessingException e) {
            log.error("Error serializing telemetry JSON: {}", e.getMessage());
            return "{}";
        }
    }

    private double calcularProgreso(Vuelo vuelo, OffsetDateTime virtual) {
        if (vuelo.getHoraSalida() == null || vuelo.getHoraLlegada() == null) return 0;
        long total = Duration.between(vuelo.getHoraSalida(), vuelo.getHoraLlegada()).toMillis();
        if (total <= 0) return 1;
        long transcurrido = Duration.between(vuelo.getHoraSalida(), virtual).toMillis();
        return (double) transcurrido / total;
    }

    public static String evaluarColor(double pct, UmbralCapacidad umbral) {
        return umbral.evaluar(pct);
    }

    private String evaluarColorNodo(double pct, SesionEjecucion sesion) {
        return evaluarColor(pct, UmbralCapacidad.desdeAlmacen(sesion));
    }

    private String evaluarColorVuelo(double pct, SesionEjecucion sesion) {
        return evaluarColor(pct, UmbralCapacidad.desdeVuelo(sesion));
    }
}
