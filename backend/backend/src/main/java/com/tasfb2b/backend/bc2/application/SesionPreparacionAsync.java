package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.application.OcupacionNodoService;
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
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Component
public class SesionPreparacionAsync {

    private static final Logger log = LoggerFactory.getLogger(SesionPreparacionAsync.class);

    private final SesionRepository sesionRepository;
    private final VueloService vueloService;
    private final ReporteSesionRepository reporteSesionRepository;
    private final SesionReadinessManager readinessManager;
    private final JdbcTemplate jdbcTemplate;
    private final OcupacionNodoService ocupacionNodoService;

    public SesionPreparacionAsync(SesionRepository sesionRepository,
                                   VueloService vueloService,
                                   ReporteSesionRepository reporteSesionRepository,
                                   SesionReadinessManager readinessManager,
                                   JdbcTemplate jdbcTemplate,
                                   OcupacionNodoService ocupacionNodoService) {
        this.sesionRepository = sesionRepository;
        this.vueloService = vueloService;
        this.reporteSesionRepository = reporteSesionRepository;
        this.readinessManager = readinessManager;
        this.jdbcTemplate = jdbcTemplate;
        this.ocupacionNodoService = ocupacionNodoService;
    }

    public void preparar(UUID id) {
        log.info("Preparacion async iniciada para sesion {}", id);
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

                // Barrido extra: EN_RUTA huerfanos de sesiones previas cuya fecha_operacion
                // cae fuera de este rango. Sin esto reaparecen en la telemetria y el usuario
                // ve vuelos "duplicados" en el mapa (mismo codigo dos veces).
                try {
                    vueloService.completarEnRutaHuerfanos(desde, hasta);
                } catch (Exception e) {
                    log.warn("Error limpiando EN_RUTA huerfanos para sesion {}: {}", id, e.getMessage());
                }

                // Reset de estado residual para arrancar "desde 0". Una sesión que COLAPSÓ o
                // finalizó por tiempo no pasa por detenerSesion(), así que deja planes/segmentos,
                // equipajes ENRUTADO y ocupación de nodos saturada. Sin esto, la siguiente sesión
                // colapsa en el tick 0 al heredar nodos por encima del umbral rojo.
                try {
                    int eqReset = jdbcTemplate.update(
                        "UPDATE equipajes SET estado = 'REGISTRADO', vuelo_actual_id = NULL " +
                        "WHERE id IN (SELECT equipaje_id FROM planes_viaje)");
                    jdbcTemplate.update("DELETE FROM segmentos_plan");
                    int planes = jdbcTemplate.update("DELETE FROM planes_viaje");
                    // Ocupación por contexto: limpia solo la de ESTA sesión (una sesión nueva ya
                    // arranca en 0, no hereda la de otras sesiones ni la de la operación).
                    ocupacionNodoService.reset(id);
                    log.info("Reset estado inicial sesion {}: {} equipajes a REGISTRADO, {} planes eliminados, nodos en 0",
                            id, eqReset, planes);
                } catch (Exception e) {
                    log.warn("Error reseteando estado inicial para sesion {}: {}", id, e.getMessage());
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
            }

            readinessManager.marcarLista(id);
            log.info("Preparacion async completada para sesion {}", id);
        } catch (Exception e) {
            log.error("Error en preparacion async de sesion {}: {}", id, e.getMessage());
        }
    }

}
