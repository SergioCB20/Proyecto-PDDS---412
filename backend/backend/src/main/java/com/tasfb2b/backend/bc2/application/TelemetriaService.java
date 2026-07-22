package com.tasfb2b.backend.bc2.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tasfb2b.backend.bc1.domain.EstadoEquipaje;
import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.application.OcupacionNodoService;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
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
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Service
public class TelemetriaService {

    private static final Logger log = LoggerFactory.getLogger(TelemetriaService.class);

    /** Horizonte virtual (horas) de vuelos PROGRAMADO incluidos en la telemetría. */
    public static final int VENTANA_TELEMETRIA_HORAS = 6;

    private final NodoLogisticoRepository nodoRepository;
    private final VueloRepository vueloRepository;
    private final EquipajeRepository equipajeRepository;
    private final TelemetriaWebSocket telemetriaWebSocket;
    private final OcupacionNodoService ocupacionNodoService;
    private final SimulacionEnrutamientoService enrutamientoService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TelemetriaService(NodoLogisticoRepository nodoRepository,
                             VueloRepository vueloRepository,
                             EquipajeRepository equipajeRepository,
                             TelemetriaWebSocket telemetriaWebSocket,
                             OcupacionNodoService ocupacionNodoService,
                             SimulacionEnrutamientoService enrutamientoService) {
        this.nodoRepository = nodoRepository;
        this.vueloRepository = vueloRepository;
        this.equipajeRepository = equipajeRepository;
        this.telemetriaWebSocket = telemetriaWebSocket;
        this.ocupacionNodoService = ocupacionNodoService;
        this.enrutamientoService = enrutamientoService;
    }

    public void emitirTelemetria(SesionEjecucion sesion) {
        try {
            String json = buildTelemetryJson(sesion);
            telemetriaWebSocket.broadcast(json);
        } catch (Exception e) {
            log.warn("Error emitting telemetry for session {}: {}", sesion.getId(), e.getMessage());
        }
    }

    // Método sobrecargado que recibe nodos y vuelos precargados (desde TickService)
    public void emitirTelemetria(SesionEjecucion sesion, List<NodoLogistico> nodos, List<Vuelo> vuelos) {
        try {
            String json = buildTelemetryJson(sesion, nodos, vuelos);
            telemetriaWebSocket.broadcast(json);
        } catch (Exception e) {
            log.warn("Error emitting telemetry for session {}: {}", sesion.getId(), e.getMessage());
        }
    }

    private String buildTelemetryJson(SesionEjecucion sesion) {
        List<NodoLogistico> nodos = nodoRepository.findAllByOrderByCodigoIataAsc();
        OffsetDateTime virtual = sesion.getDiaHoraVirtual() != null
                ? sesion.getDiaHoraVirtual()
                : OffsetDateTime.now();
        LocalDate fechaActual = virtual.toLocalDate();
        LocalDate desdeFecha = fechaActual.minusDays(1);
        LocalDate hastaFecha = fechaActual.plusDays(1);
        OffsetDateTime hasta = virtual.plusHours(VENTANA_TELEMETRIA_HORAS);
        List<Vuelo> vuelos = vueloRepository.findTelemetriaVuelos(desdeFecha, hastaFecha, virtual, hasta);
        return buildTelemetryJson(sesion, nodos, vuelos);
    }

    private String buildTelemetryJson(SesionEjecucion sesion, List<NodoLogistico> nodos, List<Vuelo> vuelos) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("timestamp", OffsetDateTime.now().toString());
        root.put("sesion_id", sesion.getId().toString());

        // Ocupación de ESTA sesión (contexto propio), no el contador global compartido.
        java.util.Map<java.util.UUID, Integer> ocupacion = ocupacionNodoService.mapa(sesion.getId());
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
            n.put("color", evaluarColorNodo(pct, sesion));
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

            if (vuelo.getEstado() == EstadoVuelo.EN_RUTA && sesion.getDiaHoraVirtual() != null) {
                double t = Math.min(Math.max(calcularProgreso(vuelo, sesion.getDiaHoraVirtual()), 0.0), 1.0);
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
        metrics.put("maletas_entregadas",
                equipajeRepository.sumCantidadByEstado(EstadoEquipaje.ENTREGADO));
        metrics.put("k", sesion.getK() != null ? sesion.getK() : 120.0);
        metrics.put("fecha_inicio_real", sesion.getFechaInicioReal() != null
                ? sesion.getFechaInicioReal().toString() : null);

        // Diagnostic: última ventana de planificación
        var diag = enrutamientoService.obtenerUltimoDiagnostico(sesion.getId());
        if (diag != null) {
            ObjectNode d = metrics.putObject("ventana_planificacion");
            d.put("inicio", diag.inicioVentana().toString());
            d.put("fin", diag.finVentana().toString());
            d.put("backlog", diag.backlog());
            d.put("window", diag.window());
            d.put("total", diag.total());
            d.put("min_fecha_op", diag.minFechaOp().toString());
            d.put("max_fecha_op", diag.maxFechaOp().toString());
        }

        try {
            return objectMapper.writeValueAsString(root);
        } catch (JsonProcessingException e) {
            log.error("Error serializing telemetry JSON: {}", e.getMessage());
            return "{}";
        }
    }

    /** Quadratic Bezier position — matches the curve rendered by the frontend. */
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
