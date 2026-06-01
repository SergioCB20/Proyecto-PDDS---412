package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.EstadoEquipaje;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
import com.tasfb2b.backend.bc2.domain.*;
import com.tasfb2b.backend.bc2.infrastructure.PuntoSLARepository;
import com.tasfb2b.backend.bc2.infrastructure.ReporteSesionRepository;
import com.tasfb2b.backend.shared.events.SesionFinalizada;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ReporteService {

    private static final Logger log = LoggerFactory.getLogger(ReporteService.class);

    private final EquipajeRepository equipajeRepository;
    private final ReporteSesionRepository reporteRepository;
    private final PuntoSLARepository puntoSLARepository;

    public ReporteService(EquipajeRepository equipajeRepository,
                          ReporteSesionRepository reporteRepository,
                          PuntoSLARepository puntoSLARepository) {
        this.equipajeRepository = equipajeRepository;
        this.reporteRepository = reporteRepository;
        this.puntoSLARepository = puntoSLARepository;
    }

    @EventListener
    @Transactional
    public void onSesionFinalizada(SesionFinalizada event) {
        if (reporteRepository.findBySesionId(event.sesionId()).isPresent()) {
            log.info("Reporte ya existe para sesion {}, omitiendo", event.sesionId());
            return;
        }
        generarReporte(event.sesionId(), event.estadoFinal());
    }

    public ReporteSesionResponse generarReporte(UUID sesionId, String estadoFinal) {
        long totalEquipajes = equipajeRepository.count();
        long incumplidos = equipajeRepository.findByEstado(EstadoEquipaje.INCUMPLIMIENTO_SLA,
                org.springframework.data.domain.Pageable.unpaged()).getTotalElements();

        BigDecimal slaIncumplidoPct = totalEquipajes > 0
                ? BigDecimal.valueOf(incumplidos * 100.0 / totalEquipajes)
                .setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        ReporteSesion reporte = new ReporteSesion(UUID.randomUUID(), sesionId);
        reporte.setSlaIncumplidoPct(slaIncumplidoPct);
        reporte.setTotalReplanificadas((int) incumplidos);

        if ("COLAPSADA".equals(estadoFinal)) {
            reporte.setPuntoColapsoVirtual(OffsetDateTime.now());
            reporte.setCausaColapso("Colapso por ocupacion de almacen");
        }

        reporteRepository.save(reporte);

        log.info("Reporte generado: sesion={}, slaIncumplidoPct={}%, totalReplanificadas={}",
                sesionId, slaIncumplidoPct, incumplidos);

        return toResponse(reporte);
    }

    public ReporteSesionResponse obtenerReporte(UUID sesionId) {
        ReporteSesion reporte = reporteRepository.findBySesionId(sesionId)
                .orElse(null);
        if (reporte == null) return null;
        return toResponse(reporte);
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
