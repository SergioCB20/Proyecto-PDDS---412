package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.EstadoEquipaje;
import com.tasfb2b.backend.bc1.domain.PlanViaje;
import com.tasfb2b.backend.bc1.domain.SegmentoPlan;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
import com.tasfb2b.backend.bc1.infrastructure.PlanViajeRepository;
import com.tasfb2b.backend.bc1.infrastructure.SegmentoPlanRepository;
import com.tasfb2b.backend.bc2.domain.*;
import com.tasfb2b.backend.bc2.infrastructure.PuntoSLARepository;
import com.tasfb2b.backend.bc2.infrastructure.ReporteSesionRepository;
import com.tasfb2b.backend.shared.events.SesionFinalizada;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
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
import java.util.UUID;

@Service
public class ReporteService {

    private static final Logger log = LoggerFactory.getLogger(ReporteService.class);

    private final EquipajeRepository equipajeRepository;
    private final ReporteSesionRepository reporteRepository;
    private final PuntoSLARepository puntoSLARepository;
    private final PlanViajeRepository planViajeRepository;
    private final SegmentoPlanRepository segmentoPlanRepository;
    private final String rutaReportesDir;

    public ReporteService(EquipajeRepository equipajeRepository,
                          ReporteSesionRepository reporteRepository,
                          PuntoSLARepository puntoSLARepository,
                          PlanViajeRepository planViajeRepository,
                          SegmentoPlanRepository segmentoPlanRepository,
                          @Value("${app.reportes.ruta-archivos:data/reportes}") String rutaReportesDir) {
        this.equipajeRepository = equipajeRepository;
        this.reporteRepository = reporteRepository;
        this.puntoSLARepository = puntoSLARepository;
        this.planViajeRepository = planViajeRepository;
        this.segmentoPlanRepository = segmentoPlanRepository;
        this.rutaReportesDir = rutaReportesDir;
    }

    @EventListener
    @Transactional
    public void onSesionFinalizada(SesionFinalizada event) {
        generarReporte(event.sesionId(), event.estadoFinal());
        exportarCsvRutas(event.sesionId());
    }

    public ReporteSesionResponse generarReporte(UUID sesionId, String estadoFinal) {
        ReporteSesion reporte = reporteRepository.findBySesionId(sesionId)
                .orElseGet(() -> new ReporteSesion(UUID.randomUUID(), sesionId));

        long totalEquipajes = equipajeRepository.count();
        long incumplidos = equipajeRepository.findByEstado(EstadoEquipaje.INCUMPLIMIENTO_SLA,
                org.springframework.data.domain.Pageable.unpaged()).getTotalElements();

        BigDecimal slaIncumplidoPct = totalEquipajes > 0
                ? BigDecimal.valueOf(incumplidos * 100.0 / totalEquipajes)
                .setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        reporte.setSlaIncumplidoPct(slaIncumplidoPct);
        reporte.setTotalReplanificadas((int) incumplidos);

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

    public String generarCsvRutas(UUID sesionId) {
        List<PlanViaje> planes = planViajeRepository.findBySesionId(sesionId);
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

            List<SegmentoPlan> segs = segmentoPlanRepository.findByPlanViajeIdOrderByOrdenAsc(plan.getId());
            if (segs.isEmpty()) {
                csv.append(eqId).append(",").append(origen).append(",").append(destino).append(",").append(sla)
                   .append(",,,,\n");
            } else {
                for (SegmentoPlan seg : segs) {
                    csv.append(eqId).append(",")
                       .append(origen).append(",")
                       .append(destino).append(",")
                       .append(sla).append(",")
                       .append(seg.getOrden()).append(",")
                       .append(seg.getVuelo().getCodigoVuelo()).append(",")
                       .append(seg.getNodoOrigen().getCodigoIata()).append(",")
                       .append(seg.getNodoDestino().getCodigoIata()).append(",")
                       .append(seg.getHoraSalidaProg()).append(",")
                       .append(seg.getVuelo().getHoraLlegada())
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

    public record PuntoSLAResponse(
            OffsetDateTime momentoVirtual,
            BigDecimal slaPct,
            Boolean huboCancelacion,
            UUID vueloCanceladoRefId
    ) {}

    public record ReporteSesionResponse(
            UUID sesionId,
            BigDecimal slaIncumplidoPct,
            Integer totalReplanificadas,
            OffsetDateTime puntoColapsoVirtual,
            UUID nodoColapsoRefId,
            String causaColapso,
            List<PuntoSLAResponse> serieSla
    ) {}
}
