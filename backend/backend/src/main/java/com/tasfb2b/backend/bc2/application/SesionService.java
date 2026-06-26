package com.tasfb2b.backend.bc2.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tasfb2b.backend.bc1.application.VueloService;
import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.EstadoEquipaje;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
import com.tasfb2b.backend.bc1.infrastructure.PlanViajeRepository;
import com.tasfb2b.backend.bc2.domain.*;
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
                         SesionLockManager lockManager) {
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
    }

    public SesionResponse crearSesion(CrearSesionRequest request) {
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
        SesionEjecucion sesion = sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));

        if (sesion.getEstado() != EstadoSesion.CONFIGURADA && sesion.getEstado() != EstadoSesion.PAUSADA) {
            throw new IllegalStateException("No se puede iniciar la sesion en estado: " + sesion.getEstado());
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
        sesionRepository.save(sesion);

        try {
            redisCacheService.setEstadoSesion(sesion.getId(), "EN_CURSO");
        } catch (Exception e) {
            log.warn("Redis no disponible al iniciar sesion {}: {}", sesion.getId(), e.getMessage());
        }

        return new SesionIniciarResponse(sesion.getId(), sesion.getEstado().name(), sesion.getFechaInicioReal());
    }

    public SesionEstadoResponse pausarSesion(UUID id) {
        SesionEjecucion sesion = sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));

        if (sesion.getEstado() != EstadoSesion.EN_CURSO) {
            throw new IllegalStateException("Solo se puede pausar una sesion EN_CURSO");
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
        SesionEjecucion sesion = sesionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Sesion no encontrada"));

        // 1. Marca FINALIZADA + quita readiness — commit inmediato. tick/planificador
        //    releen el estado cada ciclo, así no inician nuevos ciclos para esta sesión.
        sesion.setEstado(EstadoSesion.FINALIZADA);
        sesion.setFechaFinReal(OffsetDateTime.now());
        sesionRepository.save(sesion);
        readinessManager.eliminar(id);

        // 2. Espera ACOTADA a que termine cualquier ciclo de tick/planificador en vuelo
        //    antes de borrar planes/segmentos — evita StaleObjectStateException.
        var lock = lockManager.obtener(id);
        boolean locked = false;
        try {
            locked = lock.tryLock(60, java.util.concurrent.TimeUnit.SECONDS);
            if (!locked) {
                log.warn("detenerSesion {}: lock no obtenido en 60s; limpieza best-effort", id);
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

        log.info("Reseteando ocupacion de nodos a 0 para sesion {}", id);
        try {
            jdbcTemplate.update("UPDATE nodos_logisticos SET ocupacion_actual = 0");
        } catch (Exception e) {
            log.warn("Error reseteando ocupacion de nodos: {}", e.getMessage());
        }

        try {
            redisCacheService.setEstadoSesion(sesion.getId(), "FINALIZADA");
            redisCacheService.eliminarMetricasSesion(sesion.getId());
        } catch (Exception e) {
            log.warn("Redis no disponible al detener sesion {}: {}", sesion.getId(), e.getMessage());
        }

        simulacionPlanificador.limpiarSesion(sesion.getId());

        eventPublisher.publishEvent(new SesionFinalizada(
                sesion.getId(), "FINALIZADA", OffsetDateTime.now()));

        return new SesionEstadoResponse(sesion.getEstado().name());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrumpido al detener sesion " + id, e);
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
                    fechaInicioReal
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
            sesion.getFechaInicioReal()
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
}