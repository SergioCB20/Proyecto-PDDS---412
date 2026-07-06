package com.tasfb2b.backend.bc2.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tasfb2b.backend.bc1.application.OcupacionNodoService;
import com.tasfb2b.backend.bc1.application.VueloService;
import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.EstadoEquipaje;
import com.tasfb2b.backend.bc1.domain.EstadoSegmento;
import com.tasfb2b.backend.bc1.domain.PlanViaje;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
import org.springframework.data.domain.PageRequest;
import com.tasfb2b.backend.bc1.infrastructure.PlanViajeRepository;
import com.tasfb2b.backend.bc2.domain.*;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import com.tasfb2b.backend.bc2.domain.LoteReplanificacion;
import com.tasfb2b.backend.bc2.domain.ItemLote;
import com.tasfb2b.backend.bc2.domain.EventoCancelacion;
import com.tasfb2b.backend.bc2.infrastructure.ItemLoteRepository;
import com.tasfb2b.backend.bc2.infrastructure.LoteReplanificacionRepository;
import com.tasfb2b.backend.bc2.infrastructure.EventoCancelacionRepository;
import com.tasfb2b.backend.bc2.infrastructure.PuntoSLARepository;
import com.tasfb2b.backend.bc2.infrastructure.ReporteSesionRepository;
import com.tasfb2b.backend.bc2.infrastructure.SesionRepository;
import com.tasfb2b.backend.shared.events.SesionFinalizada;
import com.tasfb2b.backend.shared.infrastructure.RedisCacheService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class SesionService {

    private static final Logger log = LoggerFactory.getLogger(SesionService.class);

    private final SesionRepository sesionRepository;
    private final VueloService vueloService;
    private final RedisCacheService redisCacheService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ApplicationEventPublisher eventPublisher;
    private final ReporteSesionRepository reporteSesionRepository;
    private final PuntoSLARepository puntoSLARepository;
    private final EquipajeRepository equipajeRepository;
    private final PlanViajeRepository planViajeRepository;
    private final SesionPreparacionAsync sesionPreparacionAsync;
    private final SesionReadinessManager readinessManager;
    private final TaskExecutor taskExecutor;
    private final JdbcTemplate jdbcTemplate;
    private final SimulacionPlanificador simulacionPlanificador;
    private final SesionLockManager lockManager;
    private final ReporteService reporteService;
    private final LoteReplanificacionRepository loteReplanificacionRepository;
    private final EventoCancelacionRepository eventoCancelacionRepository;
    private final ItemLoteRepository itemLoteRepository;
    private final VueloRepository vueloRepository;
    private final OcupacionNodoService ocupacionNodoService;

    // Fecha del primer día de datos en los archivos _envios_*.txt
    private static final LocalDate FECHA_BASE_ARCHIVO = LocalDate.of(2026, 1, 2);

    public SesionService(SesionRepository sesionRepository,
                         VueloService vueloService,
                         RedisCacheService redisCacheService,
                         ApplicationEventPublisher eventPublisher,
                         ReporteSesionRepository reporteSesionRepository,
                         PuntoSLARepository puntoSLARepository,
                         EquipajeRepository equipajeRepository,
                         PlanViajeRepository planViajeRepository,
                         SesionPreparacionAsync sesionPreparacionAsync,
                         SesionReadinessManager readinessManager,
                         TaskExecutor taskExecutor,
                         JdbcTemplate jdbcTemplate,
                         SimulacionPlanificador simulacionPlanificador,
                         SesionLockManager lockManager,
                         ReporteService reporteService,
                         LoteReplanificacionRepository loteReplanificacionRepository,
                         EventoCancelacionRepository eventoCancelacionRepository,
                         ItemLoteRepository itemLoteRepository,
                         VueloRepository vueloRepository,
                         OcupacionNodoService ocupacionNodoService) {
        this.sesionRepository = sesionRepository;
        this.vueloService = vueloService;
        this.redisCacheService = redisCacheService;
        this.eventPublisher = eventPublisher;
        this.reporteSesionRepository = reporteSesionRepository;
        this.puntoSLARepository = puntoSLARepository;
        this.equipajeRepository = equipajeRepository;
        this.planViajeRepository = planViajeRepository;
        this.sesionPreparacionAsync = sesionPreparacionAsync;
        this.readinessManager = readinessManager;
        this.taskExecutor = taskExecutor;
        this.jdbcTemplate = jdbcTemplate;
        this.simulacionPlanificador = simulacionPlanificador;
        this.lockManager = lockManager;
        this.reporteService = reporteService;
        this.loteReplanificacionRepository = loteReplanificacionRepository;
        this.eventoCancelacionRepository = eventoCancelacionRepository;
        this.itemLoteRepository = itemLoteRepository;
        this.vueloRepository = vueloRepository;
        this.ocupacionNodoService = ocupacionNodoService;
    }

    public SesionResponse crearSesion(CrearSesionRequest request) {
        return crearSesion(request, null);
    }

    public SesionResponse crearSesion(CrearSesionRequest request, String dispositivoId) {
        LocalDate fecha = (request.fecha_inicio_virtual() != null)
            ? LocalDate.parse(request.fecha_inicio_virtual())
            : FECHA_BASE_ARCHIVO;
        LocalTime hora = (request.hora_inicio_virtual() != null)
            ? LocalTime.parse(request.hora_inicio_virtual())
            : LocalTime.MIDNIGHT;
        if (fecha.isBefore(FECHA_BASE_ARCHIVO)) {
            throw new IllegalArgumentException(
                "fecha_inicio_virtual debe ser >= " + FECHA_BASE_ARCHIVO +
                " (fecha base de los archivos de envíos)");
        }

        SesionEjecucion sesion = new SesionEjecucion(
            UUID.randomUUID(),
            TipoSesion.valueOf(request.tipo()),
            fecha,
            hora
        );

        if (request.prob_cancelacion() != null) {
            sesion.setProbCancelacion(request.prob_cancelacion());
        }

        if (request.tipo_simulacion() != null) {
            sesion.setTipoSimulacion(TipoSimulacion.valueOf(request.tipo_simulacion()));
        }
        // Simulación siempre 5 días; ignorar duracion_dias del request
        sesion.setDuracionDias(5);

        if (request.k() != null) {
            double k = request.k();
            if (k < 120 || k > 240) {
                throw new IllegalArgumentException("k debe estar entre 120 (60 min) y 240 (30 min)");
            }
            sesion.setK(k);
        }
        if (request.sa_segundos() != null) {
            sesion.setSaSegundos(request.sa_segundos());
        }

        if (request.umbrales_almacen() != null) {
            var u = request.umbrales_almacen();
            sesion.setAlmacenVerdeMin(u.verde_min() != null ? u.verde_min() : BigDecimal.ZERO);
            sesion.setAlmacenVerdeMax(u.verde_max() != null ? u.verde_max() : new BigDecimal("70"));
            sesion.setAlmacenAmbarMin(u.ambar_min() != null ? u.ambar_min() : new BigDecimal("70"));
            sesion.setAlmacenAmbarMax(u.ambar_max() != null ? u.ambar_max() : new BigDecimal("90"));
        }

        if (request.umbrales_vuelo() != null) {
            var u = request.umbrales_vuelo();
            sesion.setVueloVerdeMin(u.verde_min() != null ? u.verde_min() : BigDecimal.ZERO);
            sesion.setVueloVerdeMax(u.verde_max() != null ? u.verde_max() : new BigDecimal("70"));
            sesion.setVueloAmbarMin(u.ambar_min() != null ? u.ambar_min() : new BigDecimal("70"));
            sesion.setVueloAmbarMax(u.ambar_max() != null ? u.ambar_max() : new BigDecimal("90"));
        }

        if (dispositivoId != null && !dispositivoId.isBlank()) {
            sesion.setDispositivoId(dispositivoId);
        }
        sesionRepository.save(sesion);

        try {
            redisCacheService.setEstadoSesion(sesion.getId(), sesion.getEstado().name());
        } catch (Exception e) {
            log.warn("Redis no disponible al crear sesion {}: {}", sesion.getId(), e.getMessage());
        }

        return new SesionResponse(sesion.getId(), sesion.getTipo().name(), sesion.getEstado().name());
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public SesionIniciarResponse iniciarSesion(UUID id) {
        return iniciarSesion(id, null);
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public SesionIniciarResponse iniciarSesion(UUID id, String dispositivoId) {
        SesionEjecucion sesion = sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));

        if (sesion.getEstado() != EstadoSesion.CONFIGURADA && sesion.getEstado() != EstadoSesion.PAUSADA) {
            throw new IllegalStateException("No se puede iniciar la sesion en estado: " + sesion.getEstado());
        }

        if (sesion.getDispositivoId() != null && dispositivoId != null && !dispositivoId.isBlank() &&
            !sesion.getDispositivoId().equals(dispositivoId)) {
            throw new AccesoDenegadoException(
                "Solo el dispositivo que creo la sesion puede iniciarla");
        }

        if (sesion.getDispositivoId() == null && dispositivoId != null && !dispositivoId.isBlank()) {
            sesion.setDispositivoId(dispositivoId);
        }

        long enCursoCount = sesionRepository.findByEstadoWithLock(EstadoSesion.EN_CURSO).stream()
            .filter(s -> !s.getId().equals(id))
            .count();
        if (enCursoCount > 0) {
            throw new IllegalStateException("Ya existe una sesion EN_CURSO. Detenela antes de iniciar otra.");
        }

        // Calcular delta de fechas (rápido, sin UPDATE masivo)
        if (sesion.getTipo() == TipoSesion.SIMULADA && sesion.getFechaAlineadaA() == null) {
            alinearFechasEquipajes(sesion);
        }

        SesionIniciarResponse response = activarSesion(sesion);

        // Lanzar preparacion async DESPUES de que la transaccion commitee
        // para que el async vea la sesion en estado EN_CURSO en la BD
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                taskExecutor.execute(() -> sesionPreparacionAsync.preparar(id));
            }
        });

        return response;
    }

    @Transactional
    public void prepararInstanciasSimulacion(UUID id) {
        SesionEjecucion sesion = sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));

        if (sesion.getTipo() == TipoSesion.SIMULADA) {
            LocalDate desde = sesion.getFechaInicioVirtual();
            LocalDate hasta = desde.plusDays(5);

            log.info("Limpiando instancias previas para sesion {} entre {} y {}", id, desde, hasta);
            try {
                vueloService.eliminarInstanciasPorFecha(desde, hasta);
            } catch (Exception e) {
                log.warn("Error limpiando instancias para sesion {}: {}", id, e.getMessage());
            }

            // Barrido extra: EN_RUTA huerfanos de sesiones previas fuera de este rango.
            try {
                vueloService.completarEnRutaHuerfanos(desde, hasta);
            } catch (Exception e) {
                log.warn("Error limpiando EN_RUTA huerfanos al preparar sesion {}: {}", id, e.getMessage());
            }

            log.info("Clonando plantillas para sesion {} en fecha {}", id, sesion.getFechaInicioVirtual());
            try {
                int clonadas = vueloService.clonarPlantillas(sesion.getFechaInicioVirtual());
                log.info("Dia {}: {} vuelos clonados", sesion.getFechaInicioVirtual(), clonadas);
            } catch (Exception e) {
                log.warn("No se pudieron clonar plantillas para sesion {}: {}", id, e.getMessage());
            }

            alinearFechasEquipajes(sesion);
        }

        if (sesion.getTipo() == TipoSesion.SIMULADA) {
            if (reporteSesionRepository.findBySesionId(id).isEmpty()) {
                ReporteSesion reporte = new ReporteSesion(UUID.randomUUID(), id);
                reporte.setSlaIncumplidoPct(BigDecimal.ZERO);
                reporte.setTotalReplanificadas(0);
                reporteSesionRepository.save(reporte);
                log.info("ReporteSesion pre-creado {} para sesion {}", reporte.getId(), id);
            } else {
                log.info("ReporteSesion ya existe para sesion {}, se reutiliza", id);
            }
        }
    }

    /**
     * Marca la sesión como alineada a la fecha virtual.
     * Ya no modifica los 44M registros de equipajes — el planificador
     * ajusta la ventana de búsqueda con el delta sobre la marcha.
     */
    private void alinearFechasEquipajes(SesionEjecucion sesion) {
        if (sesion.getFechaAlineadaA() != null) {
            return;
        }
        sesion.setFechaAlineadaA(sesion.getFechaInicioVirtual());
        sesionRepository.save(sesion);
        log.info("Alineacion virtual para sesion {}: delta={} dias (sin UPDATE masivo)",
            sesion.getId(),
            java.time.temporal.ChronoUnit.DAYS.between(FECHA_BASE_ARCHIVO, sesion.getFechaInicioVirtual()));
    }

    @Transactional
    public SesionIniciarResponse activarSesion(SesionEjecucion sesion) {
        sesion.setEstado(EstadoSesion.EN_CURSO);
        sesion.setFechaInicioReal(OffsetDateTime.now());
        if (sesion.getSegundosRealesTranscurridos() == null || sesion.getSegundosRealesTranscurridos() > 0) {
            sesion.setSegundosRealesTranscurridos(0);
        }
        sesionRepository.save(sesion);

        try {
            redisCacheService.setEstadoSesion(sesion.getId(), "EN_CURSO");
            redisCacheService.delMetricasSesion(sesion.getId());
        } catch (Exception e) {
            log.warn("Redis no disponible al iniciar sesion {}: {}", sesion.getId(), e.getMessage());
        }

        return new SesionIniciarResponse(sesion.getId(), sesion.getEstado().name(), sesion.getFechaInicioReal());
    }

    public SesionEstadoResponse pausarSesion(UUID id) {
        return pausarSesion(id, null);
    }

    public SesionEstadoResponse pausarSesion(UUID id, String dispositivoId) {
        SesionEjecucion sesion = sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));

        if (sesion.getEstado() != EstadoSesion.EN_CURSO) {
            throw new IllegalStateException("Solo se puede pausar una sesion EN_CURSO");
        }

        if (dispositivoId == null || dispositivoId.isBlank() ||
            (sesion.getDispositivoId() != null && !sesion.getDispositivoId().equals(dispositivoId))) {
            throw new AccesoDenegadoException(
                "Solo el dispositivo que inicio la sesion puede pausarla");
        }

        sesion.setEstado(EstadoSesion.PAUSADA);
        sesionRepository.save(sesion);

        try {
            redisCacheService.setEstadoSesion(sesion.getId(), "PAUSADA");
        } catch (Exception e) {
            log.warn("Redis no disponible al pausar sesion {}: {}", sesion.getId(), e.getMessage());
        }

        return new SesionEstadoResponse(sesion.getEstado().name());
    }

    // NO @Transactional: cada paso commitea por separado. Así marcar FINALIZADA
    // se confirma de inmediato (sin mantener un lock de fila abierto mientras se
    // espera el lock JVM) y los schedulers dejan de tomar la sesión en su próximo
    // ciclo. Evita el deadlock lock-JVM + lock-de-fila.
    public SesionEstadoResponse detenerSesion(UUID id) {
        return detenerSesion(id, null);
    }

    public SesionEstadoResponse detenerSesion(UUID id, String dispositivoId) {
        SesionEjecucion sesion = sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));

        if (dispositivoId == null || dispositivoId.isBlank() ||
            (sesion.getDispositivoId() != null && !sesion.getDispositivoId().equals(dispositivoId))) {
            throw new AccesoDenegadoException(
                "Solo el dispositivo que inicio la sesion puede detenerla");
        }

        // 1. Marca FINALIZADA + quita readiness — commit inmediato. tick/planificador
        //    releen el estado cada ciclo, así no inician nuevos ciclos para esta sesión.
        sesion.setEstado(EstadoSesion.FINALIZADA);
        sesion.setFechaFinReal(OffsetDateTime.now());
        sesionRepository.save(sesion);
        readinessManager.eliminar(id);

        // 2. La limpieza pesada (esperar el lock hasta 60s, generar reporte/CSV y borrar
        //    instancias/planes de hasta 30 dias) corre en BACKGROUND. Antes corria dentro
        //    del request HTTP y podia exceder el timeout del cliente (120s) -> el front
        //    mostraba "Error al detener" aunque la sesion YA quedaba FINALIZADA en el paso 1.
        //    Ahora respondemos de inmediato y la limpieza se completa aparte.
        taskExecutor.execute(() -> limpiezaPostDetencion(id));

        return new SesionEstadoResponse(EstadoSesion.FINALIZADA.name());
    }

    /**
     * Fase 2 (background) de la detencion: espera ACOTADA al lock para no chocar con un
     * ciclo de tick/planificador en vuelo, genera el reporte ANTES de borrar y limpia el
     * estado de la sesion. Best-effort: cada paso atrapa sus errores.
     */
    public void limpiezaPostDetencion(UUID id) {
        SesionEjecucion sesion = sesionRepository.findById(id).orElse(null);
        if (sesion == null) {
            log.warn("limpiezaPostDetencion: sesion {} no encontrada", id);
            return;
        }

        var lock = lockManager.obtener(id);
        boolean locked = false;
        try {
            locked = lock.tryLock(60, java.util.concurrent.TimeUnit.SECONDS);
            if (!locked) {
                log.warn("detenerSesion {}: lock no obtenido en 60s; limpieza best-effort", id);
            }

        // Generar reporte + CSV ANTES de borrar planes/segmentos/instancias. Si se hace después
        // (o solo vía el evento async, que corre tras la limpieza) el reporte sale vacío.
        try {
            reporteService.generarReporte(id, "FINALIZADA");
            reporteService.exportarCsvRutas(id);
        } catch (Exception e) {
            log.warn("Error generando reporte al detener sesion {}: {}", id, e.getMessage());
        }

        if (sesion.getTipo() == TipoSesion.SIMULADA) {
            LocalDate desde = sesion.getFechaInicioVirtual();
            LocalDate hasta = desde.plusDays(sesion.getDuracionDias() != null ? sesion.getDuracionDias() : 30);

            log.info("Limpiando instancias de simulacion para sesion {} entre {} y {}", id, desde, hasta);
            try {
                vueloService.eliminarInstanciasPorFecha(desde, hasta);
            } catch (Exception e) {
                log.warn("Error limpiando instancias al detener sesion {}: {}", id, e.getMessage());
            }

            // Completar cualquier EN_RUTA residual fuera de este rango (huérfanos
            // de otras sesiones), para que no aparezca la próxima vez que arranque
            // una sesion con fecha_inicio_virtual distinta.
            try {
                vueloService.completarEnRutaHuerfanos(desde, hasta);
            } catch (Exception e) {
                log.warn("Error limpiando EN_RUTA huerfanos al detener sesion {}: {}", id, e.getMessage());
            }
        }

        log.info("Reseteando equipajes de la sesion {} a REGISTRADO", id);
        try {
            int resetados = jdbcTemplate.update(
                "UPDATE equipajes SET estado = 'REGISTRADO', vuelo_actual_id = NULL " +
                "WHERE id IN (SELECT equipaje_id FROM planes_viaje WHERE sesion_id = ?)", id);
            log.info("Reseteados {} equipajes a REGISTRADO para sesion {}", resetados, id);
        } catch (Exception e) {
            log.warn("Error reseteando equipajes al detener sesion {}: {}", id, e.getMessage());
        }

        log.info("Eliminando planes_viaje de la sesion {}", id);
        try {
            jdbcTemplate.update(
                "DELETE FROM segmentos_plan WHERE plan_viaje_id IN " +
                "(SELECT id FROM planes_viaje WHERE sesion_id = ?)", id);
            int planes = jdbcTemplate.update("DELETE FROM planes_viaje WHERE sesion_id = ?", id);
            log.info("Eliminados {} planes_viaje para sesion {}", planes, id);
        } catch (Exception e) {
            log.warn("Error eliminando planes_viaje al detener sesion {}: {}", id, e.getMessage());
        }

        log.info("Reseteando ocupacion de nodos de la sesion {}", id);
        try {
            // Solo la ocupación de ESTA sesión, no el global (que antes borraba también la operación).
            ocupacionNodoService.reset(id);
        } catch (Exception e) {
            log.warn("Error reseteando ocupacion de nodos: {}", e.getMessage());
        }

        try {
            redisCacheService.setEstadoSesion(id, "FINALIZADA");
            redisCacheService.eliminarMetricasSesion(id);
        } catch (Exception e) {
            log.warn("Redis no disponible al detener sesion {}: {}", id, e.getMessage());
        }

        simulacionPlanificador.limpiarSesion(id);

        eventPublisher.publishEvent(new SesionFinalizada(
                id, "FINALIZADA", OffsetDateTime.now()));

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("limpiezaPostDetencion {} interrumpida", id);
        } finally {
            if (locked) lock.unlock();
        }
    }

    public MetricasSesionResponse obtenerMetricas(UUID id) {
        try {
            String cached = redisCacheService.getMetricasSesion(id);
            if (cached != null) {
                var node = objectMapper.readTree(cached);
                OffsetDateTime fechaInicioReal = null;
                if (node.has("fecha_inicio_real") && !node.get("fecha_inicio_real").isNull()) {
                    fechaInicioReal = OffsetDateTime.parse(node.get("fecha_inicio_real").asText());
                }
                return new MetricasSesionResponse(
                    UUID.fromString(node.get("sesion_id").asText()),
                    node.get("estado").asText(),
                    OffsetDateTime.parse(node.get("dia_hora_virtual").asText()),
                    node.get("segundos_reales_transcurridos").asInt(),
                    new BigDecimal(node.get("sla_acumulado_pct").asDouble()),
                    node.get("vuelos_cancelados").asInt(),
                    node.get("maletas_replanificadas").asInt(),
                    fechaInicioReal,
                    simulacionPlanificador.obtenerUltimoTiempoPlanificacionMs(id)
                );
            }
        } catch (Exception e) {
            log.warn("Redis no disponible para metricas de sesion {}: {}", id, e.getMessage());
        }

        SesionEjecucion sesion = sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));

        return new MetricasSesionResponse(
            sesion.getId(),
            sesion.getEstado().name(),
            sesion.getDiaHoraVirtual() != null ? sesion.getDiaHoraVirtual() : OffsetDateTime.now(),
            sesion.getSegundosRealesTranscurridos() != null ? sesion.getSegundosRealesTranscurridos() : 0,
            sesion.getSlaAcumuladoPct() != null ? sesion.getSlaAcumuladoPct() : new BigDecimal("100"),
            sesion.getVuelosCancelados() != null ? sesion.getVuelosCancelados() : 0,
            sesion.getMaletasReplanificadas() != null ? sesion.getMaletasReplanificadas() : 0,
            sesion.getFechaInicioReal(),
            simulacionPlanificador.obtenerUltimoTiempoPlanificacionMs(id)
        );
    }

    public List<EnvioItemResponse> obtenerEnviosVuelo(UUID sesionId, UUID vueloId) {
        sesionRepository.findById(sesionId)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada: " + sesionId));

        List<Equipaje> equipajes = equipajeRepository.findBySesionIdAndVueloActualId(sesionId, vueloId);

        return equipajes.stream()
            .map(e -> new EnvioItemResponse(
                e.getId(),
                e.getOrigenIata(),
                e.getDestinoIata(),
                e.getIdExterno() != null ? e.getIdExterno() : e.getId().toString(),
                e.getCantidad() != null ? e.getCantidad() : 1
            ))
            .toList();
    }

    public List<EnvioItemResponse> obtenerEnviosNodo(UUID sesionId, String nodoIata) {
        sesionRepository.findById(sesionId)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada: " + sesionId));

        List<Equipaje> equipajes = equipajeRepository.findBySesionIdAndEstadoAndNodoIata(
            sesionId, EstadoEquipaje.EN_ALMACEN, nodoIata);

        return equipajes.stream()
            .map(e -> new EnvioItemResponse(
                e.getId(),
                e.getOrigenIata(),
                e.getDestinoIata(),
                e.getIdExterno() != null ? e.getIdExterno() : e.getId().toString(),
                e.getCantidad() != null ? e.getCantidad() : 1
            ))
            .toList();
    }

    public List<EnvioEntregadoResponse> obtenerEntregadosRecientes(UUID sesionId, int horas) {
        SesionEjecucion sesion = sesionRepository.findById(sesionId)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada: " + sesionId));

        if (sesion.getDiaHoraVirtual() == null) {
            return List.of();
        }

        OffsetDateTime hasta = sesion.getDiaHoraVirtual();
        OffsetDateTime desde = hasta.minusHours(horas);

        List<Equipaje> equipajes = planViajeRepository.findEntregadosRecientes(sesionId, desde, hasta);

        return equipajes.stream()
            .map(e -> {
                String codigoVuelo = "";
                if (e.getPlanViaje() != null && e.getPlanViaje().getSegmentos() != null) {
                    codigoVuelo = e.getPlanViaje().getSegmentos().stream()
                        .filter(sp -> sp.getEstado().name().equals("COMPLETADO"))
                        .max(java.util.Comparator.comparingInt(sp -> sp.getOrden() != null ? sp.getOrden() : 0))
                        .map(sp -> sp.getVuelo() != null ? sp.getVuelo().getCodigoVuelo() : "")
                        .orElse("");
                }
                return new EnvioEntregadoResponse(
                    e.getOrigenIata(),
                    e.getDestinoIata(),
                    codigoVuelo,
                    e.getCantidad() != null ? e.getCantidad() : 1
                );
            })
            .toList();
    }

    public List<EnvioPanelResponse> obtenerEnviosPanelSesion(UUID sesionId, String tipo, String origenIata, String destinoIata, String codigoEquipaje) {
        sesionRepository.findById(sesionId)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada: " + sesionId));

        List<EstadoEquipaje> estados = switch (tipo) {
            case "planificados" -> List.of(EstadoEquipaje.ENRUTADO, EstadoEquipaje.EN_ALMACEN);
            case "en_vuelo" -> List.of(EstadoEquipaje.EN_VUELO);
            case "entregados" -> List.of(EstadoEquipaje.ENTREGADO);
            default -> throw new IllegalArgumentException("tipo inválido: " + tipo);
        };
        String o = (origenIata != null && !origenIata.isBlank()) ? origenIata : null;
        String d = (destinoIata != null && !destinoIata.isBlank()) ? destinoIata : null;
        String ce = (codigoEquipaje != null && !codigoEquipaje.isBlank()) ? "%" + codigoEquipaje + "%" : null;
        List<Equipaje> equipajes = equipajeRepository.findEnviosPanel(estados, o, d, ce, PageRequest.of(0, 100));
        return equipajes.stream()
                .filter(e -> e.getPlanViaje() != null && sesionId.equals(e.getPlanViaje().getSesionId()))
                .map(e -> {
                    String codigoVuelo = "";
                    if (e.getEstado() == EstadoEquipaje.EN_VUELO && e.getVueloActual() != null) {
                        codigoVuelo = e.getVueloActual().getCodigoVuelo();
                    } else if (e.getEstado() == EstadoEquipaje.ENTREGADO && e.getPlanViaje() != null) {
                        codigoVuelo = e.getPlanViaje().getSegmentos().stream()
                                .filter(sp -> sp.getEstado() == EstadoSegmento.COMPLETADO)
                                .max(java.util.Comparator.comparingInt(sp -> sp.getOrden() != null ? sp.getOrden() : 0))
                                .map(sp -> sp.getVuelo() != null ? sp.getVuelo().getCodigoVuelo() : "")
                                .orElse("");
                    } else if (e.getPlanViaje() != null && e.getPlanViaje().getSegmentos() != null
                            && !e.getPlanViaje().getSegmentos().isEmpty()) {
                        var first = e.getPlanViaje().getSegmentos().iterator().next();
                        if (first.getVuelo() != null) {
                            codigoVuelo = first.getVuelo().getCodigoVuelo();
                        }
                    }
                    return new EnvioPanelResponse(
                            e.getId(),
                            e.getOrigenIata(),
                            e.getDestinoIata(),
                            codigoVuelo,
                            e.getEstado().name(),
                            e.getCantidad() != null ? e.getCantidad() : 1
                    );
                })
                .toList();
    }

    public List<EnvioItemResponse> obtenerDatosUltimosPlanificados(List<UUID> equipajeIds) {
        if (equipajeIds == null || equipajeIds.isEmpty()) return List.of();
        List<Equipaje> equipajes = equipajeRepository.findAllById(equipajeIds);
        return equipajes.stream()
            .map(e -> new EnvioItemResponse(
                e.getId(),
                e.getOrigenIata(),
                e.getDestinoIata(),
                e.getIdExterno() != null ? e.getIdExterno() : e.getId().toString(),
                e.getCantidad() != null ? e.getCantidad() : 1
            ))
            .toList();
    }

    public SesionEjecucion obtenerSesion(UUID id) {
        return sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));
    }

    public List<SesionListaResponse> listarSesiones(String estado) {
        List<SesionEjecucion> sesiones;
        if (estado != null && !estado.isBlank()) {
            try {
                sesiones = sesionRepository.findByEstado(EstadoSesion.valueOf(estado.toUpperCase()));
            } catch (IllegalArgumentException e) {
                log.warn("Estado de sesion invalido: {}", estado);
                sesiones = List.of();
            }
        } else {
            sesiones = sesionRepository.findAll();
        }
        return sesiones.stream()
            .map(s -> new SesionListaResponse(
                s.getId(),
                s.getTipo().name(),
                s.getTipoSimulacion() != null ? s.getTipoSimulacion().name() : "VENTANA_FIJA",
                s.getEstado().name(),
                s.getFechaInicioVirtual().toString(),
                s.getCreatedAt() != null ? s.getCreatedAt().toString() : null
            ))
            .toList();
    }

    public ReplanificacionDetalleResponse obtenerDetalleReplanificacion(UUID sesionId, UUID loteId) {
        LoteReplanificacion lote = loteReplanificacionRepository.findById(loteId)
                .orElseThrow(() -> new IllegalArgumentException("Lote no encontrado: " + loteId));
        if (!lote.getSesionId().equals(sesionId)) {
            throw new IllegalArgumentException("El lote no pertenece a la sesion indicada");
        }

        EventoCancelacion evento = eventoCancelacionRepository.findById(lote.getEventoId())
                .orElseThrow(() -> new IllegalArgumentException("Evento no encontrado"));

        var vuelo = vueloRepository.findById(evento.getVueloRefId())
                .orElse(null);

        List<ItemLote> items = itemLoteRepository.findByLoteId(loteId);
        List<Equipaje> equipajes = equipajeRepository.findAllById(
                items.stream().map(ItemLote::getEquipajeRefId).toList());

        List<EquipajeReplanificadoResponse> eqList = equipajes.stream()
                .map(e -> {
                    String vueloCodigo = null;
                    UUID vueloId = null;
                    List<SegmentoReplanInfo> segmentos = List.of();
                    try {
                        PlanViaje pv = planViajeRepository.findByEquipajeId(e.getId()).orElse(null);
                        if (pv != null && pv.getSegmentos() != null && !pv.getSegmentos().isEmpty()) {
                            segmentos = pv.getSegmentos().stream()
                                    .map(s -> new SegmentoReplanInfo(
                                            s.getOrden(),
                                            s.getVuelo().getId(),
                                            s.getVuelo().getCodigoVuelo(),
                                            s.getNodoOrigen().getCodigoIata(),
                                            s.getNodoDestino().getCodigoIata(),
                                            s.getHoraSalidaProg() != null
                                                    ? s.getHoraSalidaProg().toString()
                                                    : null))
                                    .toList();
                            var primero = segmentos.get(0);
                            vueloCodigo = primero.vueloCodigo();
                            vueloId = primero.vueloId();
                        }
                    } catch (Exception ex) {
                        log.warn("No se pudo cargar plan_viaje para equipaje {}: {}", e.getId(), ex.getMessage());
                    }
                    return new EquipajeReplanificadoResponse(
                            e.getId(),
                            e.getIdExterno() != null ? e.getIdExterno() : e.getId().toString(),
                            e.getOrigenIata(),
                            e.getDestinoIata(),
                            e.getEstado().name(),
                            vueloId,
                            vueloCodigo,
                            segmentos);
                })
                .toList();

        return new ReplanificacionDetalleResponse(
                lote.getId(),
                evento.getVueloRefId(),
                vuelo != null ? vuelo.getCodigoVuelo() : "?",
                evento.getCausa(),
                evento.getOcurridoEnVirtual() != null ? evento.getOcurridoEnVirtual().toString() : null,
                lote.getTotalEquipajes() != null ? lote.getTotalEquipajes() : 0,
                eqList);
    }

    public record ReplanificacionDetalleResponse(
            UUID lote_id,
            UUID vuelo_id,
            String vuelo_codigo,
            String causa,
            String ocurrido_en_virtual,
            int total_equipajes,
            List<EquipajeReplanificadoResponse> equipajes
    ) {}

    public record EquipajeReplanificadoResponse(
            UUID id,
            String codigo,
            String origen_iata,
            String destino_iata,
            String estado_actual,
            UUID vuelo_replanificado_id,
            String vuelo_replanificado_codigo,
            List<SegmentoReplanInfo> plan_viaje
    ) {
        public EquipajeReplanificadoResponse(UUID id, String codigo, String origen_iata,
                                             String destino_iata, String estado_actual) {
            this(id, codigo, origen_iata, destino_iata, estado_actual, null, null, List.of());
        }
    }
}