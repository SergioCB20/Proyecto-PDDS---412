package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.EstadoEquipaje;
import com.tasfb2b.backend.bc1.domain.PlanViaje;
import com.tasfb2b.backend.bc1.domain.SegmentoPlan;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
import com.tasfb2b.backend.bc1.infrastructure.PlanViajeRepository;
import com.tasfb2b.backend.bc1.infrastructure.SegmentoPlanRepository;
import com.tasfb2b.backend.bc2.domain.*;
import com.tasfb2b.backend.bc2.domain.SesionEjecucion;
import com.tasfb2b.backend.bc2.infrastructure.ItemLoteRepository;
import com.tasfb2b.backend.bc2.infrastructure.LoteReplanificacionRepository;
import com.tasfb2b.backend.bc2.infrastructure.EventoCancelacionRepository;
import com.tasfb2b.backend.bc2.infrastructure.ItemLoteRepository;
import com.tasfb2b.backend.bc2.infrastructure.LoteReplanificacionRepository;
import com.tasfb2b.backend.bc2.infrastructure.PuntoSLARepository;
import com.tasfb2b.backend.bc2.infrastructure.ReporteSesionRepository;
import com.tasfb2b.backend.bc2.infrastructure.SesionRepository;
import com.tasfb2b.backend.shared.events.SesionFinalizada;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReporteService {

    private static final Logger log = LoggerFactory.getLogger(ReporteService.class);
    private static final ZoneId PERU_ZONE = ZoneId.of("America/Lima");
    private static final DateTimeFormatter PERU_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final EquipajeRepository equipajeRepository;
    private final ReporteSesionRepository reporteRepository;
    private final PuntoSLARepository puntoSLARepository;
    private final PlanViajeRepository planViajeRepository;
    private final SegmentoPlanRepository segmentoPlanRepository;
    private final SesionRepository sesionRepository;
    private final LoteReplanificacionRepository loteRepository;
    private final ItemLoteRepository itemLoteRepository;
    private final EventoCancelacionRepository eventoCancelacionRepository;
    private final String rutaReportesDir;

    public ReporteService(EquipajeRepository equipajeRepository,
                          ReporteSesionRepository reporteRepository,
                          PuntoSLARepository puntoSLARepository,
                          PlanViajeRepository planViajeRepository,
                          SegmentoPlanRepository segmentoPlanRepository,
                          SesionRepository sesionRepository,
                          LoteReplanificacionRepository loteRepository,
                          ItemLoteRepository itemLoteRepository,
                          EventoCancelacionRepository eventoCancelacionRepository,
                          @Value("${app.reportes.ruta-archivos:data/reportes}") String rutaReportesDir) {
        this.equipajeRepository = equipajeRepository;
        this.reporteRepository = reporteRepository;
        this.puntoSLARepository = puntoSLARepository;
        this.planViajeRepository = planViajeRepository;
        this.segmentoPlanRepository = segmentoPlanRepository;
        this.sesionRepository = sesionRepository;
        this.loteRepository = loteRepository;
        this.itemLoteRepository = itemLoteRepository;
        this.eventoCancelacionRepository = eventoCancelacionRepository;
        this.rutaReportesDir = rutaReportesDir;
    }

    @EventListener
    @Async
    @Transactional
    public void onSesionFinalizada(SesionFinalizada event) {
        generarReporte(event.sesionId(), event.estadoFinal());
        exportarCsvRutas(event.sesionId());
    }

    public ReporteSesionResponse generarReporte(UUID sesionId, String estadoFinal) {
        java.util.Optional<ReporteSesion> existente = reporteRepository.findBySesionId(sesionId);

        long totalEquipajes = planViajeRepository.countConEquipajeBySesionId(sesionId);

        // No recomputar con ceros cuando ya no quedan planes: detenerSesion genera el reporte
        // SINCRONICAMENTE antes de borrar los planes, y luego el evento async vuelve a entrar
        // con los planes ya borrados. Sin esta guarda, esa segunda pasada dejaba el reporte en 0
        // (era la causa de "el reporte sale todo vacío").
        if (totalEquipajes == 0 && existente.isPresent()) {
            log.info("Reporte de sesion {} ya generado; se preserva (no hay planes que recomputar)", sesionId);
            return toResponse(existente.get());
        }

        ReporteSesion reporte = existente.orElseGet(() -> new ReporteSesion(UUID.randomUUID(), sesionId));

        // SLA incumplido = maletas NO entregadas al cerrar la simulacion, sobre el total
        // con equipaje. Mismo origen de datos que TickService.actualizarSla (entregados/total).
        long entregados = planViajeRepository.countEntregadosBySesionId(sesionId);
        long incumplidos = Math.max(0, totalEquipajes - entregados);

        // Replanificadas = contador acumulado en la sesion (lo incrementa ReplanificacionService).
        long replanificados = sesionRepository.findById(sesionId)
                .map(SesionEjecucion::getMaletasReplanificadas)
                .map(Integer::longValue)
                .orElse(0L);

        BigDecimal slaIncumplidoPct = totalEquipajes > 0
                ? BigDecimal.valueOf(incumplidos * 100.0 / totalEquipajes)
                .setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        reporte.setSlaIncumplidoPct(slaIncumplidoPct);
        reporte.setTotalReplanificadas((int) replanificados);

        if ("COLAPSADA".equals(estadoFinal)) {
            OffsetDateTime puntoColapso = sesionRepository.findById(sesionId)
                    .map(SesionEjecucion::getDiaHoraVirtual)
                    .orElse(null);
            reporte.setPuntoColapsoVirtual(puntoColapso != null ? puntoColapso : OffsetDateTime.now());
            reporte.setCausaColapso(
                    "Colapso: incumplimiento de SLA (deadline 24h/48h superado) o saturación de almacén");
        }

        reporteRepository.save(reporte);

        log.info("Reporte generado/actualizado: sesion={}, slaIncumplidoPct={}%, totalReplanificadas={}",
                sesionId, slaIncumplidoPct, incumplidos);

        return toResponse(reporte);
    }

    public ReporteSesionResponse obtenerReporte(UUID sesionId) {
        ReporteSesion reporte = reporteRepository.findBySesionId(sesionId)
                .orElse(null);
        if (reporte == null) return null;
        return toResponse(reporte);
    }

    @Transactional(readOnly = true)
    public String generarCsvRutas(UUID sesionId) {
        Map<UUID, OffsetDateTime> fechaReplanPorEquipaje = equipajesReplanificados(sesionId);

        if (fechaReplanPorEquipaje.isEmpty()) {
            StringBuilder vacio = new StringBuilder();
            vacio.append("envio_id,origen_iata,destino_iata,sla_comprometido,")
                 .append("segmento_orden,vuelo_codigo,nodo_origen_iata,nodo_destino_iata,")
                 .append("hora_salida,hora_llegada,fecha_replanificacion_virtual\n");
            return vacio.toString();
        }

        List<PlanViaje> todosPlanes = planViajeRepository.findBySesionIdWithEquipaje(sesionId);

        List<PlanViaje> planes = todosPlanes.stream()
                .filter(p -> p.getEquipaje() != null
                        && fechaReplanPorEquipaje.containsKey(p.getEquipaje().getId()))
                .toList();
        if (planes.isEmpty()) return "";

        List<UUID> planIds = planes.stream().map(PlanViaje::getId).toList();
        List<SegmentoPlan> todosSegmentos = segmentoPlanRepository.findByPlanViajeIdInOrderByOrdenAsc(planIds);
        Map<UUID, List<SegmentoPlan>> segmentosPorPlan = todosSegmentos.stream()
                .collect(Collectors.groupingBy(seg -> seg.getPlanViaje().getId()));

        StringBuilder csv = new StringBuilder();
        csv.append("envio_id,origen_iata,destino_iata,sla_comprometido,")
           .append("segmento_orden,vuelo_codigo,nodo_origen_iata,nodo_destino_iata,")
           .append("hora_salida,hora_llegada,fecha_replanificacion_virtual\n");

        for (PlanViaje plan : planes) {
            Equipaje eq = plan.getEquipaje();
            String eqId = eq.getId().toString();
            String origen = eq.getOrigenIata();
            String destino = eq.getDestinoIata();
            String sla = peruFormat(eq.getSlaComprometido());
            OffsetDateTime fechaReplan = fechaReplanPorEquipaje.get(eq.getId());
            String fechaReplanStr = peruFormat(fechaReplan);

            List<SegmentoPlan> segs = segmentosPorPlan.getOrDefault(plan.getId(), List.of());
            if (segs.isEmpty()) {
                csv.append(eqId).append(",").append(origen).append(",").append(destino).append(",").append(sla)
                   .append(",,,,,,").append(fechaReplanStr).append("\n");
            } else {
                for (SegmentoPlan seg : segs) {
                    String vueloCodigo = seg.getVuelo() != null ? nullSafe(seg.getVuelo().getCodigoVuelo()) : "";
                    String horaLlegada = seg.getVuelo() != null && seg.getVuelo().getHoraLlegada() != null
                            ? peruFormat(seg.getVuelo().getHoraLlegada()) : "";
                    String nodoOri = seg.getNodoOrigen() != null ? nullSafe(seg.getNodoOrigen().getCodigoIata()) : "";
                    String nodoDes = seg.getNodoDestino() != null ? nullSafe(seg.getNodoDestino().getCodigoIata()) : "";
                    String horaSal = seg.getHoraSalidaProg() != null ? peruFormat(seg.getHoraSalidaProg()) : "";

                    csv.append(eqId).append(",")
                       .append(origen).append(",")
                       .append(destino).append(",")
                       .append(sla).append(",")
                       .append(seg.getOrden()).append(",")
                       .append(vueloCodigo).append(",")
                       .append(nodoOri).append(",")
                       .append(nodoDes).append(",")
                       .append(horaSal).append(",")
                       .append(horaLlegada).append(",")
                       .append(fechaReplanStr)
                       .append("\n");
                }
            }
        }
        return csv.toString();
    }

    private static String peruFormat(OffsetDateTime odt) {
        if (odt == null) return "";
        return odt.atZoneSameInstant(PERU_ZONE).format(PERU_FMT);
    }

    /**
     * Devuelve equipajeId -> OffsetDateTime (ocurridoEnVirtual) de todas las
     * maletas replanificadas en la sesion (sin filtro de ventana temporal).
     * Si una misma maleta fue replanificada varias veces, gana la fecha MAS RECIENTE.
     */
    Map<UUID, OffsetDateTime> equipajesReplanificados(UUID sesionId) {
        if (eventoCancelacionRepository == null || loteRepository == null || itemLoteRepository == null) {
            return Collections.emptyMap();
        }

        List<EventoCancelacion> eventos = eventoCancelacionRepository.findBySesionId(sesionId).stream()
                .filter(e -> e.getOcurridoEnVirtual() != null)
                .toList();
        if (eventos.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<UUID, OffsetDateTime> eventoAFecha = eventos.stream()
                .collect(Collectors.toMap(EventoCancelacion::getId, EventoCancelacion::getOcurridoEnVirtual));

        Set<UUID> eventoIds = eventoAFecha.keySet();
        List<LoteReplanificacion> lotes = loteRepository.findBySesionId(sesionId).stream()
                .filter(l -> eventoIds.contains(l.getEventoId()))
                .toList();
        if (lotes.isEmpty()) {
            return Collections.emptyMap();
        }

        List<UUID> loteIds = lotes.stream().map(LoteReplanificacion::getId).toList();
        List<ItemLote> items = itemLoteRepository.findByLoteIdIn(loteIds);

        Map<UUID, OffsetDateTime> resultado = new HashMap<>();
        for (ItemLote item : items) {
            UUID equipajeId = item.getEquipajeRefId();
            LoteReplanificacion lote = lotes.stream()
                    .filter(l -> l.getId().equals(item.getLoteId()))
                    .findFirst().orElse(null);
            if (lote == null) continue;
            OffsetDateTime fechaEvento = eventoAFecha.get(lote.getEventoId());
            if (fechaEvento == null) continue;
            OffsetDateTime existente = resultado.get(equipajeId);
            if (existente == null || fechaEvento.isAfter(existente)) {
                resultado.put(equipajeId, fechaEvento);
            }
        }
        return resultado;
    }

    public void exportarCsvRutas(UUID sesionId) {
        String csv = generarCsvRutas(sesionId);
        if (csv == null || csv.isBlank()) {
            log.info("CSV de replanificados vacío para sesion {} (sin planes o sin replan); no se sobrescribe", sesionId);
            return;
        }
        try {
            Path dir = Paths.get(rutaReportesDir);
            Files.createDirectories(dir);
            Path archivo = dir.resolve("replanificados_sesion_" + sesionId.toString().replace("-", "_") + ".csv");
            Files.writeString(archivo, csv, StandardCharsets.UTF_8);
            log.info("CSV de replanificados exportado: {}", archivo.toAbsolutePath());
        } catch (Exception e) {
            log.error("Error exportando CSV de replanificados para sesion {}: {}", sesionId, e.getMessage());
        }
    }

    private static String nullSafe(String s) {
        return s != null ? s : "";
    }

    private ReporteSesionResponse toResponse(ReporteSesion reporte) {
        List<PuntoSLAResponse> serieSla = puntoSLARepository
                .findByReporteIdOrderByMomentoVirtual(reporte.getId())
                .stream()
                .map(p -> new PuntoSLAResponse(
                        p.getMomentoVirtual(),
                        p.getSlaPct(),
                        p.getHuboCancelacion(),
                        p.getVueloCanceladoRefId()))
                .toList();

        return new ReporteSesionResponse(
                reporte.getSesionId(),
                reporte.getSlaIncumplidoPct(),
                reporte.getTotalReplanificadas(),
                reporte.getPuntoColapsoVirtual(),
                reporte.getNodoColapsoRefId(),
                reporte.getCausaColapso(),
                serieSla);
    }

    // Componentes en snake_case para que Jackson emita las claves que espera el
    // frontend (serie_sla, sla_pct, …), igual que el resto de DTOs del proyecto.
    public record PuntoSLAResponse(
            OffsetDateTime momento_virtual,
            BigDecimal sla_pct,
            Boolean hubo_cancelacion,
            UUID vuelo_cancelado_ref_id
    ) {}

    public record ReporteSesionResponse(
            UUID sesion_id,
            BigDecimal sla_incumplido_pct,
            Integer total_replanificadas,
            OffsetDateTime punto_colapso_virtual,
            UUID nodo_colapso_ref_id,
            String causa_colapso,
            List<PuntoSLAResponse> serie_sla
    ) {}
}
