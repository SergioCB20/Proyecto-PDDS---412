package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.application.VueloService;
import com.tasfb2b.backend.bc2.domain.EstadoSesion;
import com.tasfb2b.backend.bc2.domain.ReporteSesion;
import com.tasfb2b.backend.bc2.domain.SesionEjecucion;
import com.tasfb2b.backend.bc2.domain.TipoSesion;
import com.tasfb2b.backend.bc2.infrastructure.ReporteSesionRepository;
import com.tasfb2b.backend.bc2.infrastructure.SesionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Component
public class SesionPreparacionAsync {

    private static final Logger log = LoggerFactory.getLogger(SesionPreparacionAsync.class);

    // Fecha del primer día de datos en los archivos _envios_*.txt
    private static final LocalDate FECHA_BASE_ARCHIVO = LocalDate.of(2026, 1, 2);

    private final SesionRepository sesionRepository;
    private final VueloService vueloService;
    private final ReporteSesionRepository reporteSesionRepository;
    private final JdbcTemplate jdbcTemplate;
    private final SesionReadinessManager readinessManager;

    public SesionPreparacionAsync(SesionRepository sesionRepository,
                                   VueloService vueloService,
                                   ReporteSesionRepository reporteSesionRepository,
                                   JdbcTemplate jdbcTemplate,
                                   SesionReadinessManager readinessManager) {
        this.sesionRepository = sesionRepository;
        this.vueloService = vueloService;
        this.reporteSesionRepository = reporteSesionRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.readinessManager = readinessManager;
    }

    @Async
    @Transactional
    public void preparar(UUID id) {
        try {
            SesionEjecucion sesion = sesionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada: " + id));

            if (sesion.getEstado() != EstadoSesion.EN_CURSO) {
                log.warn("Sesion {} ya no esta EN_CURSO ({}), saltando preparacion", id, sesion.getEstado());
                return;
            }

            if (sesion.getTipo() == TipoSesion.SIMULADA) {
                LocalDate desde = sesion.getFechaInicioVirtual();
                LocalDate hasta = desde.plusDays(sesion.getDuracionDias() != null ? sesion.getDuracionDias() : 30);

                log.info("Limpiando instancias previas para sesion {} entre {} y {}", id, desde, hasta);
                try {
                    vueloService.eliminarInstanciasPorFecha(desde, hasta);
                } catch (Exception e) {
                    log.warn("Error limpiando instancias para sesion {}: {}", id, e.getMessage());
                }

                log.info("Clonando plantillas para sesion {} en fecha {}", id, sesion.getFechaInicioVirtual());
                try {
                    int clonadas = vueloService.clonarPlantillas(sesion.getFechaInicioVirtual());
                    log.info("Dia {}: {} vuelos clonados", sesion.getFechaInicioVirtual(), clonadas);

                    if (reporteSesionRepository.findBySesionId(id).isEmpty()) {
                        ReporteSesion reporte = new ReporteSesion(UUID.randomUUID(), id);
                        reporte.setSlaIncumplidoPct(BigDecimal.ZERO);
                        reporte.setTotalReplanificadas(0);
                        reporteSesionRepository.save(reporte);
                        log.info("ReporteSesion pre-creado {} para sesion {}", reporte.getId(), id);
                    } else {
                        log.info("ReporteSesion ya existe para sesion {}, se reutiliza", id);
                    }
                } catch (Exception e) {
                    log.warn("No se pudieron clonar plantillas para sesion {}: {}", id, e.getMessage());
                }

                alinearFechasEquipajes(sesion);
            }

            readinessManager.marcarLista(id);
            log.info("Preparacion async completada para sesion {}", id);
        } catch (Exception e) {
            log.error("Error en preparacion async de sesion {}: {}", id, e.getMessage());
        }
    }

    private void alinearFechasEquipajes(SesionEjecucion sesion) {
        LocalDate fechaInicioVirtual = sesion.getFechaInicioVirtual();

        if (sesion.getFechaAlineadaA() != null) {
            log.info("Alineacion ya aplicada para sesion {}: fecha_alineada_a={}", sesion.getId(), sesion.getFechaAlineadaA());
            return;
        }

        long targetOffset = java.time.temporal.ChronoUnit.DAYS.between(FECHA_BASE_ARCHIVO, fechaInicioVirtual);

        long appliedOffset = 0;
        try {
            Integer prev = jdbcTemplate.queryForObject(
                "SELECT COALESCE(MAX(fecha_alineada_a) - DATE '2026-01-02', 0) " +
                "FROM sesiones_ejecucion WHERE fecha_alineada_a IS NOT NULL AND id != ?",
                Integer.class, sesion.getId());
            appliedOffset = prev != null ? prev.longValue() : 0;
        } catch (Exception e) {
            // No hay alineaciones previas
        }

        long delta = targetOffset - appliedOffset;
        if (delta == 0) {
            log.info("Fechas ya alineadas para sesion {}", sesion.getId());
            sesion.setFechaAlineadaA(fechaInicioVirtual);
            sesionRepository.save(sesion);
            return;
        }

        String signo = delta > 0 ? "+" : "-";
        long diasAbs = Math.abs(delta);
        int actualizados = jdbcTemplate.update(
            "UPDATE equipajes SET fecha_operacion = fecha_operacion + (? * INTERVAL '1 day'), " +
            "sla_comprometido = sla_comprometido + (? * INTERVAL '1 day') " +
            "WHERE estado = 'REGISTRADO'",
            delta, delta
        );
        log.info("Alineacion de fechas para sesion {}: {} dias ({}{}). {} equipajes actualizados.",
            sesion.getId(), diasAbs, signo, diasAbs, actualizados);

        sesion.setFechaAlineadaA(fechaInicioVirtual);
        sesionRepository.save(sesion);
    }
}
