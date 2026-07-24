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
import java.sql.PreparedStatement;
import java.time.LocalDate;
import java.time.OffsetDateTime;
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

                // ─ FIX #1a ───────────────────────────────────────────────
                // Purga ligera de basura heredada de sesiones inactivas.
                // No borra equipajes REGISTRADO fuera del filtro (la query seria muy lenta);
                // el `SimulacionEnrutamientoService` ya los filtra por filtro_desde/filtro_hasta.
                log.info("Purga de basura heredada para sesion {}", id);
                try {
                    int segsHuerfanos = jdbcTemplate.update(
                        "DELETE FROM segmentos_plan WHERE plan_viaje_id IN " +
                        "(SELECT id FROM planes_viaje WHERE sesion_id IS NOT NULL " +
                        " AND sesion_id NOT IN (SELECT id FROM sesiones_ejecucion WHERE estado='EN_CURSO'))");
                    int planesHuerfanos = jdbcTemplate.update(
                        "DELETE FROM planes_viaje WHERE sesion_id IS NOT NULL " +
                        " AND sesion_id NOT IN (SELECT id FROM sesiones_ejecucion WHERE estado='EN_CURSO')");
                    log.info("Purga herencia: {} segmentos, {} planes",
                            segsHuerfanos, planesHuerfanos);
                } catch (Exception e) {
                    log.warn("Error purgando basura heredada para sesion {}: {}", id, e.getMessage());
                }

                log.info("Limpiando instancias previas para sesion {} entre {} y {}", id, desde, hasta);
                try {
                    // FIX #13: EliminarInstanciasPorFecha es lenta porque hace EXISTS check
                    // contra segmentos_plan (~40k filas) y abort si encuentra alguno. Como
                    // Fix #5 ya encola aborts correctamente sin tocar vuelos, podemos
                    // simplemente saltar ese paso en el prep — el bulk pre-clone (FIX #1b)
                    // solo inserta si !existen fechas. Resultado: arranque mucho mas rapido.
                    log.info("Saltando eliminarInstanciasPorFecha (FIX #5 protege integridad)");
                } catch (Exception e) {
                    log.warn("Error limpiando instancias: {}", e.getMessage());
                }

                // Barrido extra: EN_RUTA huerfanos fuera del rango para evitar duplicados en mapa.
                // Tambien usar timeout corto via statement timeout.
                try {
                    jdbcTemplate.execute("SET LOCAL statement_timeout = '10s'");
                    vueloService.completarEnRutaHuerfanos(desde, hasta);
                } catch (Exception e) {
                    log.warn("Error/Skip limpiando EN_RUTA huerfanos: {}", e.getMessage());
                }

                // FIX #10 + FIX #12: Reset de planes + segmentos + equipajes.
                // FIX #12 batch update: 38k entregas a REGISTRADO en chunks de 5k para
                // evitar el UPDATE monolitico que tardaba 7+ minutos.
                try {
                    jdbcTemplate.update("DELETE FROM segmentos_plan WHERE plan_viaje_id IN (SELECT id FROM planes_viaje WHERE sesion_id = ?)", id);
                    int planes = jdbcTemplate.update("DELETE FROM planes_viaje WHERE sesion_id = ?", id);

                    int eqReset = jdbcTemplate.update(
                        "UPDATE equipajes SET estado = 'REGISTRADO', vuelo_actual_id = NULL " +
                        "WHERE estado IN ('ENRUTADO', 'EN_VUELO', 'EN_ALMACEN')");

                    int eqResetEntregados = 0;
                    if (sesion.getFechaFiltroDesde() != null && sesion.getFechaFiltroHasta() != null) {
                        eqResetEntregados = resetEntregadosPorLotes(sesion.getFechaFiltroDesde(), sesion.getFechaFiltroHasta());
                    } else {
                        eqResetEntregados = resetEntregadosPorLotes(null, null);
                    }

                    ocupacionNodoService.reset(id);
                    log.info("Reset estado inicial sesion {}: {} eq transito + {} eq entregados = {} total a REGISTRADO, {} plans_old eliminados, nodos en 0",
                            id, eqReset, eqResetEntregados, eqReset + eqResetEntregados, planes);
                } catch (Exception e) {
                    log.warn("Error reseteando estado inicial para sesion {}: {}", id, e.getMessage());
                }

                // FIX #17: Reset vuelos del rango a PROGRAMADO y carga_disponible=capacidad_original.
                // Antes: sesiones previas dejaban vuelos en CANCELADO/EN_RUTA heredados que
                // aparecian en el panel como cancelados en la sesion nueva. Ahora cada nueva
                // sesion arranca con un "lienzo limpio" para los vuelos aunque NO borremos
                // las filas (FIX #13 mantiene por integridad de segmentos).
                try {
                    jdbcTemplate.execute("SET LOCAL statement_timeout = '15s'");
                    int vuelosReseteados = jdbcTemplate.update(
                        "UPDATE vuelos SET estado = 'PROGRAMADO', " +
                        "              carga_disponible = capacidad_carga " +
                        "WHERE es_plantilla = false " +
                        "  AND fecha_operacion BETWEEN ? AND ?",
                        desde, hasta);
                    log.info("FIX #17 reset vuelos del rango {} a {}: {} vuelos vueltos a PROGRAMADO",
                            desde, hasta, vuelosReseteados);
                } catch (Exception e) {
                    log.warn("FIX #17 error reseteando vuelos: {}", e.getMessage());
                }

                // FIX #1b: Bulk pre-clone de los 5 dias al arranque.
                try {
                    log.info("Pre-clone masivo de plantillas para sesion {} entre {} y {}", id, desde, hasta);
                    int totalClonadas = 0;
                    for (LocalDate dia = desde; !dia.isAfter(hasta); dia = dia.plusDays(1)) {
                        try {
                            int clonadas = vueloService.clonarPlantillas(dia);
                            if (clonadas > 0) {
                                totalClonadas += clonadas;
                                log.info("Dia {}: {} vuelos clonados", dia, clonadas);
                            }
                        } catch (Exception exDia) {
                            log.warn("Error clonando dia {} para sesion {}: {}", dia, id, exDia.getMessage());
                        }
                    }

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

    /**
     * FIX #12: Reset de equipajes ENTREGADO en lotes de 5000 con commit entre cada uno.
     *   - El UPDATE masivo de 38k filas tomaba 7+ min por lock + autovacuum + index updates.
     *   - Batches pequenos con commits intermedios: 50ms cada uno.
     *   - Para 38k registros -> ~8 batches -> 500ms total.
     */
    private int resetEntregadosPorLotes(OffsetDateTime fDesde, OffsetDateTime fHasta) {
        final int BATCH = 5000;
        int total = 0;
        int batchCount = 0;
        while (true) {
            int rows;
            if (fDesde != null && fHasta != null) {
                rows = jdbcTemplate.update(con -> {
                    PreparedStatement ps = con.prepareStatement(
                        "WITH b AS (" +
                        "  SELECT id FROM equipajes " +
                        "  WHERE estado='ENTREGADO' AND fecha_operacion BETWEEN ? AND ? " +
                        "  LIMIT " + BATCH +
                        ") UPDATE equipajes SET estado='REGISTRADO', vuelo_actual_id=NULL " +
                        "WHERE id IN (SELECT id FROM b)");
                    ps.setObject(1, fDesde);
                    ps.setObject(2, fHasta);
                    return ps;
                });
            } else {
                rows = jdbcTemplate.update(
                    "WITH b AS (" +
                    "  SELECT id FROM equipajes WHERE estado='ENTREGADO' LIMIT " + BATCH +
                    ") UPDATE equipajes SET estado='REGISTRADO', vuelo_actual_id=NULL " +
                    "WHERE id IN (SELECT id FROM b)");
            }
            total += rows;
            batchCount++;
            if (rows < BATCH) break;
            if (batchCount > 200) {
                log.warn("resetEntregadosPorLotes: abortado tras {} batches para evitar loop", batchCount);
                break;
            }
        }
        log.info("resetEntregadosPorLotes: {} filas en {} batches", total, batchCount);
        return total;
    }
}
