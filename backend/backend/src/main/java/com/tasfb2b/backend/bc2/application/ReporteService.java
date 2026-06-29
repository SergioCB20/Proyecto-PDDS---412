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
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ReporteService {

    private static final Logger log = LoggerFactory.getLogger(ReporteService.class);

    private final EquipajeRepository equipajeRepository;
    private final ReporteSesionRepository reporteRepository;
    private final PuntoSLARepository puntoSLARepository;
    private final PlanViajeRepository planViajeRepository;
    private final SegmentoPlanRepository segmentoPlanRepository;
    private final SesionRepository sesionRepository;
    private final String rutaReportesDir;

    public ReporteService(EquipajeRepository equipajeRepository,
                          ReporteSesionRepository reporteRepository,
                          PuntoSLARepository puntoSLARepository,
                          PlanViajeRepository planViajeRepository,
                          SegmentoPlanRepository segmentoPlanRepository,
                          SesionRepository sesionRepository,
                          @Value("${app.reportes.ruta-archivos:data/reportes}") String rutaReportesDir) {
        this.equipajeRepository = equipajeRepository;
        this.reporteRepository = reporteRepository;
        this.puntoSLARepository = puntoSLARepository;
        this.planViajeRepository = planViajeRepository;
        this.segmentoPlanRepository = segmentoPlanRepository;
        this.sesionRepository = sesionRepository;
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
        ReporteSesion reporte = reporteRepository.findBySesionId(sesionId)
                .orElseGet(() -> new ReporteSesion(UUID.randomUUID(), sesionId));

        // SLA incumplido = maletas NO entregadas al cerrar la simulacion, sobre el total
        // con equipaje. Mismo origen de datos que TickService.actualizarSla (entregados/total),
        // que es lo unico que la simulacion realmente actualiza por tick. El estado
        // INCUMPLIMIENTO_SLA solo lo marca la operacion real, nunca la simulacion, por eso
        // contar ese estado daba siempre 0%.
        long totalEquipajes = planViajeRepository.countConEquipajeBySesionId(sesionId);
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
            reporte.setPuntoColapsoVirtual(OffsetDateTime.now());
            reporte.setCausaColapso("Colapso por ocupacion de almacen");
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
        List<PlanViaje> planes = planViajeRepository.findBySesionIdWithEquipaje(sesionId);
        if (planes.isEmpty()) return "";

        List<UUID> planIds = planes.stream().map(PlanViaje::getId).toList();
        List<SegmentoPlan> todosSegmentos = segmentoPlanRepository.findByPlanViajeIdInOrderByOrdenAsc(planIds);
        Map<UUID, List<SegmentoPlan>> segmentosPorPlan = todosSegmentos.stream()
                .collect(Collectors.groupingBy(seg -> seg.getPlanViaje().getId()));

        StringBuilder csv = new StringBuilder();
        csv.append("equipaje_id,origen_iata,destino_iata,sla_comprometido,")
           .append("segmento_orden,vuelo_codigo,nodo_origen_iata,nodo_destino_iata,")
           .append("hora_salida,hora_llegada\n");

        for (PlanViaje plan : planes) {
            Equipaje eq = plan.getEquipaje();
            String eqId = eq.getId().toString();
            String origen = eq.getOrigenIata();
            String destino = eq.getDestinoIata();
            String sla = eq.getSlaComprometido() != null ? eq.getSlaComprometido().toString() : "";

            List<SegmentoPlan> segs = segmentosPorPlan.getOrDefault(plan.getId(), List.of());
            if (segs.isEmpty()) {
                // 6 campos de segmento vacios para cuadrar con la cabecera (10 columnas).
                csv.append(eqId).append(",").append(origen).append(",").append(destino).append(",").append(sla)
                   .append(",,,,,,\n");
            } else {
                for (SegmentoPlan seg : segs) {
                    String vueloCodigo = seg.getVuelo() != null ? nullSafe(seg.getVuelo().getCodigoVuelo()) : "";
                    String horaLlegada = seg.getVuelo() != null && seg.getVuelo().getHoraLlegada() != null
                            ? seg.getVuelo().getHoraLlegada().toString() : "";
                    String nodoOri = seg.getNodoOrigen() != null ? nullSafe(seg.getNodoOrigen().getCodigoIata()) : "";
                    String nodoDes = seg.getNodoDestino() != null ? nullSafe(seg.getNodoDestino().getCodigoIata()) : "";
                    String horaSal = seg.getHoraSalidaProg() != null ? seg.getHoraSalidaProg().toString() : "";

                    csv.append(eqId).append(",")
                       .append(origen).append(",")
                       .append(destino).append(",")
                       .append(sla).append(",")
                       .append(seg.getOrden()).append(",")
                       .append(vueloCodigo).append(",")
                       .append(nodoOri).append(",")
                       .append(nodoDes).append(",")
                       .append(horaSal).append(",")
                       .append(horaLlegada)
                       .append("\n");
                }
            }
        }
        return csv.toString();
    }

    public void exportarCsvRutas(UUID sesionId) {
        String csv = generarCsvRutas(sesionId);
        try {
            Path dir = Paths.get(rutaReportesDir);
            Files.createDirectories(dir);
            Path archivo = dir.resolve("rutas_sesion_" + sesionId.toString().replace("-", "_") + ".csv");
            Files.writeString(archivo, csv, StandardCharsets.UTF_8);
            log.info("CSV de rutas exportado: {}", archivo.toAbsolutePath());
        } catch (Exception e) {
            log.error("Error exportando CSV de rutas para sesion {}: {}", sesionId, e.getMessage());
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
