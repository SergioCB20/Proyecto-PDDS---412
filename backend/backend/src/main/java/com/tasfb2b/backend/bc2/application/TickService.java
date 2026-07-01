package com.tasfb2b.backend.bc2.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tasfb2b.backend.bc1.application.VueloService;
import com.tasfb2b.backend.bc1.domain.*;
import com.tasfb2b.backend.bc1.infrastructure.*;
import com.tasfb2b.backend.bc2.domain.*;
import com.tasfb2b.backend.bc2.infrastructure.PuntoSLARepository;
import com.tasfb2b.backend.bc2.infrastructure.ReporteSesionRepository;
import com.tasfb2b.backend.bc2.infrastructure.SesionRepository;
import com.tasfb2b.backend.shared.events.SesionFinalizada;
import com.tasfb2b.backend.shared.infrastructure.RedisCacheService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
public class TickService {

    private static final Logger log = LoggerFactory.getLogger(TickService.class);
    private static final long TICK_INTERVAL_MS = 5000;
    private static final Random RANDOM = new Random();

    // Fecha base de la línea temporal de los archivos _envios_*.txt (sla_comprometido / fecha_operacion).
    private static final LocalDate FECHA_BASE_ARCHIVO = LocalDate.of(2026, 1, 2);

    private final SesionRepository sesionRepository;
    private final VueloRepository vueloRepository;
    private final EquipajeRepository equipajeRepository;
    private final SegmentoPlanRepository segmentoPlanRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final RedisCacheService redisCacheService;
    private final TelemetriaService telemetriaService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final VueloService vueloService;
    private final ReplanificacionService replanificacionService;
    private final ApplicationEventPublisher eventPublisher;
    private final ReporteSesionRepository reporteSesionRepository;
    private final PuntoSLARepository puntoSLARepository;
    private final PlanViajeRepository planViajeRepository;
    private final SesionReadinessManager readinessManager;
    private final SesionLockManager lockManager;
    private final double k;

    private final ConcurrentHashMap<UUID, Integer> ultimaHoraRegistrada = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<UUID, LocalDate> ultimaFechaClonada = new ConcurrentHashMap<>();

    public TickService(SesionRepository sesionRepository,
                       VueloRepository vueloRepository,
                       EquipajeRepository equipajeRepository,
                       SegmentoPlanRepository segmentoPlanRepository,
                       NodoLogisticoRepository nodoRepository,
                       RedisCacheService redisCacheService,
                       TelemetriaService telemetriaService,
                       VueloService vueloService,
                       ReplanificacionService replanificacionService,
                       ApplicationEventPublisher eventPublisher,
                       ReporteSesionRepository reporteSesionRepository,
                        PuntoSLARepository puntoSLARepository,
                        PlanViajeRepository planViajeRepository,
                        SesionReadinessManager readinessManager,
                        SesionLockManager lockManager) {
        this.sesionRepository = sesionRepository;
        this.vueloRepository = vueloRepository;
        this.equipajeRepository = equipajeRepository;
        this.segmentoPlanRepository = segmentoPlanRepository;
        this.nodoRepository = nodoRepository;
        this.redisCacheService = redisCacheService;
        this.telemetriaService = telemetriaService;
        this.vueloService = vueloService;
        this.replanificacionService = replanificacionService;
        this.eventPublisher = eventPublisher;
        this.reporteSesionRepository = reporteSesionRepository;
        this.puntoSLARepository = puntoSLARepository;
        this.planViajeRepository = planViajeRepository;
        this.readinessManager = readinessManager;
        this.lockManager = lockManager;
        this.k = 120.0; // fallback; el valor real viene de sesion.getK()
    }

    @Scheduled(fixedRate = TICK_INTERVAL_MS)
    public void tick() {
        List<SesionEjecucion> sesionesActivas = sesionRepository.findByEstado(EstadoSesion.EN_CURSO);
        if (sesionesActivas.isEmpty()) return;

        for (SesionEjecucion sesion : sesionesActivas) {
            try {
                procesarTick(sesion);
            } catch (Exception e) {
                log.error("Error processing tick for session {}: {}", sesion.getId(), e.getMessage(), e);
            }
        }
    }

    private void procesarTick(SesionEjecucion sesion) {
        if (!readinessManager.estaLista(sesion.getId())) {
            return;
        }

        // Serializa con el planificador (corren en hilos distintos del scheduler):
        // ambos mutan segmentos_plan/vuelos/nodos de la MISMA sesión.
        var lock = lockManager.obtener(sesion.getId());
        boolean adquirido;
        try {
            adquirido = lock.tryLock(TICK_INTERVAL_MS - 1000, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return;
        }
        if (!adquirido) {
            // Planificador ocupado — avanzar reloj para que el timer del frontend
            // no se congele. El trabajo pesado (vuelos, SLA, telemetría) se salta
            // para no interferir con el planificador; el próximo tick que adquiera
            // el lock ejecutará normal.
            log.debug("[SIM {}] Planificador ocupado, tick salteado (solo reloj)", idCorto(sesion.getId()));
            avanzarRelojVirtual(sesion);
            sesionRepository.save(sesion);
            return;
        }
        try {
            ejecutarTick(sesion);
        } finally {
            lock.unlock();
        }
    }

    private void ejecutarTick(SesionEjecucion sesion) {
        long inicioNanos = System.nanoTime();
        OffsetDateTime now = OffsetDateTime.now();

        OffsetDateTime virtualAntes = sesion.getDiaHoraVirtual();
        avanzarRelojVirtual(sesion);

        if (virtualAntes == null) {
            double kEfectivo = sesion.getK() != null ? sesion.getK() : k;
            log.info("[SIM {}] ARRANQUE sesion tipo={} | inicio virtual={} | k={} (1s real = {} virtual) | tick cada {}s",
                    idCorto(sesion.getId()), sesion.getTipo(), sesion.getDiaHoraVirtual(),
                    fmt(kEfectivo), formatDuracion(sesion.getDiaHoraVirtual(),
                            sesion.getDiaHoraVirtual().plusSeconds((long) kEfectivo)),
                    TICK_INTERVAL_MS / 1000);
        }

        // Auto-finalizar al completar 5 días virtuales
        if (debeFinalizarPorTiempo(sesion)) {
            finalizarSesionPorTiempo(sesion, now);
            return;
        }

        // Auto-finalizar tras 4 horas reales de actividad si nadie lo detiene
        Integer secs = sesion.getSegundosRealesTranscurridos();
        if (secs != null && secs >= 4 * 3600) {
            log.info("Sesion {} alcanzó 4 horas reales de actividad. Finalizando automaticamente.",
                    sesion.getId());
            finalizarSesionPorTiempo(sesion, now);
            return;
        }

        clonarParaNuevoDia(sesion);
        registrarPuntoSla(sesion);
        int salidas = procesarVuelosSalida(sesion);
        int llegadas = procesarVuelosLlegada(sesion);
        int cancelados = evaluarCancelaciones(sesion, now);
        actualizarSla(sesion);

        // Un solo save al final del tick
        sesionRepository.save(sesion);

        // Cargar datos UNA SOLA VEZ para telemetria.
        // Vuelos: EN_RUTA + PROGRAMADO dentro de la ventana virtual, no todos los días clonados.
        List<NodoLogistico> nodos = nodoRepository.findAllByOrderByCodigoIataAsc();
        OffsetDateTime virtualActual = sesion.getDiaHoraVirtual() != null
                ? sesion.getDiaHoraVirtual()
                : OffsetDateTime.now();
        java.time.LocalDate fechaActual = virtualActual.toLocalDate();
        java.time.LocalDate desdeFecha = fechaActual.minusDays(1);
        java.time.LocalDate hastaFecha = fechaActual.plusDays(1);
        OffsetDateTime ventanaTelemetria = virtualActual.plusHours(TelemetriaService.VENTANA_TELEMETRIA_HORAS);
        List<Vuelo> vuelos = vueloRepository.findTelemetriaVuelos(desdeFecha, hastaFecha, ventanaTelemetria);

        // Colapso por saturación de almacén (umbral rojo de nodo, cualquier tipo de sesión) o
        // por incumplimiento del primer SLA (solo HASTA_COLAPSO). Ambas son causas que impiden
        // cumplir el SLA; cualquiera detiene la sesión. OR con corto-circuito evita doble disparo.
        boolean colapso = detectarColapso(sesion, now, nodos) || detectarIncumplimientoSla(sesion, now);
        escribirMetricas(sesion, now);
        telemetriaService.emitirTelemetria(sesion, nodos, vuelos);

        long duracionMs = (System.nanoTime() - inicioNanos) / 1_000_000;
        logResumenTick(sesion, virtualAntes, salidas, llegadas, cancelados, nodos, duracionMs);

        if (colapso) {
            detenerSesionPorColapso(sesion, now);
        }
    }

    /**
     * Resumen por tick: una sola línea por sesión con el estado del proceso de
     * simulación para seguirlo desde la terminal del server. Incluye el avance del
     * reloj virtual, el ritmo (k), el conteo de la flota por estado, el SLA, los
     * eventos del tick y el nodo más cargado.
     */
    private void logResumenTick(SesionEjecucion sesion, OffsetDateTime virtualAntes,
                                int salidas, int llegadas, int cancelados,
                                List<NodoLogistico> nodos, long duracionMs) {
        if (!log.isInfoEnabled()) return;

        // Conteo de la flota por estado en una sola consulta agregada.
        long prog = 0, ruta = 0, comp = 0, canc = 0;
        for (Object[] fila : vueloRepository.countByEstadoNotPlantillaGrouped()) {
            String estado = String.valueOf(fila[0]);
            long n = ((Number) fila[1]).longValue();
            switch (estado) {
                case "PROGRAMADO" -> prog = n;
                case "EN_RUTA" -> ruta = n;
                case "COMPLETADO" -> comp = n;
                case "CANCELADO" -> canc = n;
                default -> { }
            }
        }

        // Nodo más cargado (early signal de saturación / colapso).
        String nodoTop = "-";
        double pctTop = 0;
        for (NodoLogistico nodo : nodos) {
            double pct = nodo.getOcupacionPorcentaje();
            if (pct > pctTop) { pctTop = pct; nodoTop = nodo.getCodigoIata(); }
        }

        double kEfectivo = sesion.getK() != null ? sesion.getK() : k;
        int segReales = sesion.getSegundosRealesTranscurridos() != null
                ? sesion.getSegundosRealesTranscurridos() : 0;
        double sla = sesion.getSlaAcumuladoPct() != null ? sesion.getSlaAcumuladoPct().doubleValue() : 100.0;

        log.info("[SIM {}] tick virt={} (+{}) real={}s k={} | flota PROG={} RUTA={} COMP={} CANC={} | "
                        + "SLA={}% | evento salidas={} llegadas={} cancel={} | nodoMax={} {}% | proc={}ms",
                idCorto(sesion.getId()),
                sesion.getDiaHoraVirtual(),
                formatDuracion(virtualAntes, sesion.getDiaHoraVirtual()),
                segReales, fmt(kEfectivo),
                prog, ruta, comp, canc,
                fmt(sla),
                salidas, llegadas, cancelados,
                nodoTop, fmt(pctTop),
                duracionMs);
    }

    private static String idCorto(UUID id) {
        String s = id.toString();
        return s.substring(0, 8);
    }

    private static String fmt(double v) {
        return String.format(Locale.US, "%.1f", v);
    }

    /** Duración legible (HhMm / Mm) entre dos instantes; "-" si falta alguno. */
    private static String formatDuracion(OffsetDateTime desde, OffsetDateTime hasta) {
        if (desde == null || hasta == null) return "-";
        long min = java.time.Duration.between(desde, hasta).toMinutes();
        String signo = min < 0 ? "-" : "";
        min = Math.abs(min);
        long h = min / 60;
        long m = min % 60;
        return h > 0 ? String.format("%s%dh%02dm", signo, h, m) : String.format("%s%dm", signo, m);
    }

    private boolean debeFinalizarPorTiempo(SesionEjecucion sesion) {
        // HASTA_COLAPSO no tiene tope de tiempo: corre hasta que un nodo colapse.
        // Solo VENTANA_FIJA finaliza al completar los 5 dias virtuales.
        if (sesion.getTipoSimulacion() == TipoSimulacion.HASTA_COLAPSO) return false;
        if (sesion.getDiaHoraVirtual() == null || sesion.getFechaInicioVirtual() == null) return false;
        // HASTA_COLAPSO no tiene fin determinado: corre hasta el primer incumplimiento de SLA,
        // no se autofinaliza por tiempo.
        if (sesion.getTipoSimulacion() == TipoSimulacion.HASTA_COLAPSO) return false;
        LocalDate fechaFin = sesion.getFechaInicioVirtual().plusDays(5);
        return !sesion.getDiaHoraVirtual().toLocalDate().isBefore(fechaFin);
    }

    private void finalizarSesionPorTiempo(SesionEjecucion sesion, OffsetDateTime now) {
        log.info("Sesion {} alcanzó 5 dias virtuales. Finalizando automaticamente.", sesion.getId());
        sesion.setEstado(EstadoSesion.FINALIZADA);
        sesion.setFechaFinReal(now);
        sesionRepository.save(sesion);

        ultimaHoraRegistrada.remove(sesion.getId());
        ultimaFechaClonada.remove(sesion.getId());
        readinessManager.eliminar(sesion.getId());
        lockManager.eliminar(sesion.getId());

        try {
            redisCacheService.setEstadoSesion(sesion.getId(), "FINALIZADA");
            redisCacheService.eliminarMetricasSesion(sesion.getId());
        } catch (Exception e) {
            log.warn("Redis no disponible al finalizar sesion {}: {}", sesion.getId(), e.getMessage());
        }

        eventPublisher.publishEvent(new SesionFinalizada(sesion.getId(), "FINALIZADA", now));
        telemetriaService.emitirTelemetria(sesion);
    }

    private void avanzarRelojVirtual(SesionEjecucion sesion) {
        double kEfectivo = sesion.getK() != null ? sesion.getK() : k;
        long virtualMinutos = (long) ((TICK_INTERVAL_MS / 1000.0) * kEfectivo / 60);

        if (sesion.getDiaHoraVirtual() == null) {
            OffsetDateTime inicio = OffsetDateTime.of(
                    sesion.getFechaInicioVirtual(),
                    sesion.getHoraInicioVirtual(),
                    ZoneOffset.UTC);
            sesion.setDiaHoraVirtual(inicio);
        } else {
            sesion.setDiaHoraVirtual(sesion.getDiaHoraVirtual().plusMinutes(virtualMinutos));
        }
        sesion.setSegundosRealesTranscurridos(
                (sesion.getSegundosRealesTranscurridos() != null ? sesion.getSegundosRealesTranscurridos() : 0)
                        + (int) (TICK_INTERVAL_MS / 1000));
        // Save se hace al final del tick en procesarTick
    }

    private void clonarParaNuevoDia(SesionEjecucion sesion) {
        if (sesion.getTipo() != TipoSesion.SIMULADA) return;
        if (sesion.getDiaHoraVirtual() == null) return;

        LocalDate fechaActual = sesion.getDiaHoraVirtual().toLocalDate();
        LocalDate ultima = ultimaFechaClonada.get(sesion.getId());
        if (fechaActual.equals(ultima)) return;

        // Si ya existen instancias para esta fecha (ej. preparacion las clonó), marcar y salir
        if (vueloService.existenInstanciasParaFecha(fechaActual)) {
            ultimaFechaClonada.put(sesion.getId(), fechaActual);
            return;
        }

        try {
            int clonadas = vueloService.clonarPlantillas(fechaActual);
            if (clonadas > 0) {
                log.info("Progressive clone: {} vuelos creados para fecha {} en sesion {}",
                        clonadas, fechaActual, sesion.getId());
            }
            ultimaFechaClonada.put(sesion.getId(), fechaActual);
        } catch (Exception e) {
            log.warn("Error en clonado progresivo para sesion {} fecha {}: {}",
                    sesion.getId(), fechaActual, e.getMessage());
            // Si falló por duplicado, los vuelos ya existen: marcar para no reintentar
            ultimaFechaClonada.put(sesion.getId(), fechaActual);
        }
    }

    private void registrarPuntoSla(SesionEjecucion sesion) {
        if (sesion.getTipo() != TipoSesion.SIMULADA) return;
        if (sesion.getDiaHoraVirtual() == null) return;

        int horaVirtual = sesion.getDiaHoraVirtual().getHour();
        Integer ultimo = ultimaHoraRegistrada.get(sesion.getId());
        if (ultimo != null && ultimo == horaVirtual) return;

        UUID sesionId = sesion.getId();
        ReporteSesion reporte = reporteSesionRepository.findBySesionId(sesionId).orElse(null);
        if (reporte == null) return;

        PuntoSLA punto = new PuntoSLA(
                UUID.randomUUID(),
                reporte.getId(),
                sesion.getDiaHoraVirtual(),
                sesion.getSlaAcumuladoPct() != null ? sesion.getSlaAcumuladoPct() : BigDecimal.valueOf(100));
        puntoSLARepository.save(punto);

        ultimaHoraRegistrada.put(sesionId, horaVirtual);
        log.debug("PuntoSLA registrado para sesion {}: hora virtual {}, sla={}%",
                sesionId, horaVirtual, punto.getSlaPct());
    }

    private int procesarVuelosSalida(SesionEjecucion sesion) {
        OffsetDateTime virtual = sesion.getDiaHoraVirtual();
        List<Vuelo> saliendo = vueloRepository.findByEstadoAndEsPlantillaAndHoraSalidaLessThanEqual(
                EstadoVuelo.PROGRAMADO, false, virtual);

        if (saliendo.isEmpty()) return 0;

        List<Vuelo> vuelosActualizar = new ArrayList<>();
        List<SegmentoPlan> segmentosActualizar = new ArrayList<>();
        List<Equipaje> equipajesActualizar = new ArrayList<>();
        Map<UUID, Integer> nodosCarga = new HashMap<>();

        for (Vuelo vuelo : saliendo) {
            vuelo.setEstado(EstadoVuelo.EN_RUTA);

            NodoLogistico origen = vuelo.getOrigen();

            List<SegmentoPlan> segmentos = segmentoPlanRepository.findByVueloIdAndEstado(
                    vuelo.getId(), EstadoSegmento.PENDIENTE);

            // Carga real que aborda este vuelo al despegar — fija la ocupación del
            // vuelo de forma determinista, independiente del contador carga_disponible
            // que el planificador ajusta/restaura ciclo a ciclo.
            int abordando = 0;
            for (SegmentoPlan seg : segmentos) {
                seg.setEstado(EstadoSegmento.EN_CURSO);
                segmentosActualizar.add(seg);

                if (seg.getPlanViaje() != null && seg.getPlanViaje().getEquipaje() != null) {
                    Equipaje eq = seg.getPlanViaje().getEquipaje();
                    eq.setEstado(EstadoEquipaje.EN_VUELO);
                    eq.setVueloActual(vuelo);
                    equipajesActualizar.add(eq);
                    int cantidad = eq.getCantidad() != null ? eq.getCantidad() : 1;
                    abordando += cantidad;
                    nodosCarga.merge(origen.getId(), cantidad, Integer::sum);
                }
            }

            // Ocupación = capacidad - lo que realmente abordó. Visible en el mapa.
            int capacidad = vuelo.getCapacidadCarga() != null ? vuelo.getCapacidadCarga() : 0;
            vuelo.setCargaDisponible(Math.max(0, capacidad - abordando));
            vuelosActualizar.add(vuelo);
        }

        vueloRepository.saveAll(vuelosActualizar);
        segmentoPlanRepository.saveAll(segmentosActualizar);
        equipajeRepository.saveAll(equipajesActualizar);

        for (Map.Entry<UUID, Integer> entry : nodosCarga.entrySet()) {
            nodoRepository.findById(entry.getKey()).ifPresent(nodo -> {
                nodo.setOcupacionActual(Math.max(0, nodo.getOcupacionActual() - entry.getValue()));
                nodoRepository.save(nodo);
            });
        }

        if (log.isInfoEnabled()) {
            for (Vuelo v : saliendo) {
                int cap = v.getCapacidadCarga() != null ? v.getCapacidadCarga() : 0;
                int ocupado = cap - (v.getCargaDisponible() != null ? v.getCargaDisponible() : 0);
                log.info("[SIM {}] DESPEGA {} {}->{} | salida={} llegada={} dur={} | carga={}/{}",
                        idCorto(sesion.getId()), v.getCodigoVuelo(),
                        v.getOrigen().getCodigoIata(), v.getDestino().getCodigoIata(),
                        v.getHoraSalida(), v.getHoraLlegada(),
                        formatDuracion(v.getHoraSalida(), v.getHoraLlegada()),
                        ocupado, cap);
            }
        }
        return saliendo.size();
    }

    private int procesarVuelosLlegada(SesionEjecucion sesion) {
        OffsetDateTime virtual = sesion.getDiaHoraVirtual();
        List<Vuelo> llegando = vueloRepository.findByEstadoAndEsPlantillaAndHoraLlegadaLessThanEqual(
                EstadoVuelo.EN_RUTA, false, virtual);

        if (llegando.isEmpty()) return 0;

        List<Vuelo> vuelosActualizar = new ArrayList<>();
        List<SegmentoPlan> segmentosActualizar = new ArrayList<>();
        List<Equipaje> equipajesActualizar = new ArrayList<>();
        Map<UUID, Integer> nodosCarga = new HashMap<>();

        for (Vuelo vuelo : llegando) {
            vuelo.setEstado(EstadoVuelo.COMPLETADO);
            vuelosActualizar.add(vuelo);

            NodoLogistico destino = vuelo.getDestino();

            List<SegmentoPlan> segmentos = segmentoPlanRepository.findByVueloIdAndEstado(
                    vuelo.getId(), EstadoSegmento.EN_CURSO);
            for (SegmentoPlan seg : segmentos) {
                seg.setEstado(EstadoSegmento.COMPLETADO);
                segmentosActualizar.add(seg);

                if (seg.getPlanViaje() != null && seg.getPlanViaje().getEquipaje() != null) {
                    Equipaje eq = seg.getPlanViaje().getEquipaje();
                    int cantidad = eq.getCantidad() != null ? eq.getCantidad() : 1;

                    // Último segmento = no quedan segmentos de mayor orden sin completar
                    boolean esUltimoSegmento = seg.getPlanViaje().getSegmentos().stream()
                            .noneMatch(s -> s.getOrden() > seg.getOrden()
                                    && s.getEstado() != EstadoSegmento.COMPLETADO);

                    if (esUltimoSegmento) {
                        eq.setEstado(EstadoEquipaje.ENTREGADO);
                        eq.setVueloActual(null);
                    } else {
                        eq.setEstado(EstadoEquipaje.EN_ALMACEN);
                        nodosCarga.merge(destino.getId(), cantidad, Integer::sum);
                    }
                    equipajesActualizar.add(eq);
                }
            }
        }

        vueloRepository.saveAll(vuelosActualizar);
        segmentoPlanRepository.saveAll(segmentosActualizar);
        equipajeRepository.saveAll(equipajesActualizar);

        for (Map.Entry<UUID, Integer> entry : nodosCarga.entrySet()) {
            nodoRepository.findById(entry.getKey()).ifPresent(nodo -> {
                nodo.setOcupacionActual(nodo.getOcupacionActual() + entry.getValue());
                nodoRepository.save(nodo);
            });
        }

        if (log.isInfoEnabled()) {
            for (Vuelo v : llegando) {
                log.info("[SIM {}] ATERRIZA {} {}->{} | llegada={}",
                        idCorto(sesion.getId()), v.getCodigoVuelo(),
                        v.getOrigen().getCodigoIata(), v.getDestino().getCodigoIata(),
                        v.getHoraLlegada());
            }
        }
        return llegando.size();
    }

    private int evaluarCancelaciones(SesionEjecucion sesion, OffsetDateTime now) {
        BigDecimal prob = sesion.getProbCancelacion();
        if (prob == null || prob.compareTo(BigDecimal.ZERO) <= 0) return 0;

        OffsetDateTime virtual = sesion.getDiaHoraVirtual();
        if (virtual == null) return 0;

        // Solo vuelos que AUN NO SALEN: PROGRAMADO con salida en la proxima ventana virtual
        // (despues de la hora actual, antes del proximo tick). procesarVuelosSalida ya movio
        // a EN_RUTA los de salida <= virtual, asi que estos no han despegado todavia. Cada
        // vuelo se evalua una sola vez, el tick justo antes de su despegue.
        double kEfectivo = sesion.getK() != null ? sesion.getK() : k;
        long pasoVirtualMin = Math.max(1, (long) ((TICK_INTERVAL_MS / 1000.0) * kEfectivo / 60));
        OffsetDateTime hasta = virtual.plusMinutes(pasoVirtualMin);

        List<Vuelo> programados = vueloRepository.findByEstadoAndEsPlantillaAndHoraSalidaBetween(
                EstadoVuelo.PROGRAMADO, false, virtual.plusSeconds(1), hasta);

        int canceladosTick = 0;
        int replanificadasTick = 0;
        for (Vuelo vuelo : programados) {
            if (RANDOM.nextDouble() < prob.doubleValue()) {
                log.info("[SIM {}] CANCELA {} {}->{} (prob={}) -> replanificando",
                        idCorto(sesion.getId()), vuelo.getCodigoVuelo(),
                        vuelo.getOrigen().getCodigoIata(), vuelo.getDestino().getCodigoIata(), prob);

                ReplanificacionResult r = replanificacionService.replanificarEnSesion(
                        sesion.getId(), vuelo.getId(),
                        "Cancelacion probabilistica en tick",
                        sesion.getDiaHoraVirtual());
                canceladosTick++;
                replanificadasTick += r.afectados();
            }
        }

        // Acumular en la MISMA instancia de sesion del tick: el save() final del tick los
        // persiste. Antes el incremento se hacia en otra instancia dentro de
        // replanificarEnSesion y el save del tick lo sobrescribia (lost update).
        if (canceladosTick > 0) {
            sesion.setVuelosCancelados(
                    (sesion.getVuelosCancelados() != null ? sesion.getVuelosCancelados() : 0) + canceladosTick);
            sesion.setMaletasReplanificadas(
                    (sesion.getMaletasReplanificadas() != null ? sesion.getMaletasReplanificadas() : 0) + replanificadasTick);
        }
        return canceladosTick;
    }

    private void actualizarSla(SesionEjecucion sesion) {
        // Counts agregados en BD en lugar de materializar todos los planes+equipaje por tick.
        long total = planViajeRepository.countConEquipajeBySesionId(sesion.getId());
        if (total == 0) return;

        long totalEntregados = planViajeRepository.countEntregadosBySesionId(sesion.getId());

        double sla = (totalEntregados * 100.0) / total;
        sesion.setSlaAcumuladoPct(BigDecimal.valueOf(sla));
        // Save se hace al final del tick en procesarTick
    }

    /**
     * Colapso por saturación de almacén: si la ocupación de algún nodo supera el umbral rojo
     * configurado, la sesión colapsa. Es una de las causas (aeropuerto saturado) que impiden
     * cumplir el SLA. Aplica a cualquier tipo de simulación.
     */
    private boolean detectarColapso(SesionEjecucion sesion, OffsetDateTime now, List<NodoLogistico> nodos) {
        BigDecimal rojoMax = sesion.getAlmacenRojoMax();
        if (rojoMax == null) return false;

        for (NodoLogistico nodo : nodos) {
            double pct = nodo.getOcupacionPorcentaje();
            if (pct > rojoMax.doubleValue()) {
                log.warn("COLAPSO en sesion {}: nodo {} ocupacion {}% supera umbral rojo {}%",
                        sesion.getId(), nodo.getCodigoIata(), pct, rojoMax);

                sesion.setEstado(EstadoSesion.COLAPSADA);
                sesion.setFechaFinReal(now);
                sesionRepository.save(sesion);

                readinessManager.eliminar(sesion.getId());
                try {
                    redisCacheService.setEstadoSesion(sesion.getId(), "COLAPSADA");
                    redisCacheService.setMetricasSesion(sesion.getId(), buildMetricasJson(sesion, now, true));
                } catch (Exception e) {
                    log.warn("Redis no disponible al colapsar sesion {}: {}", sesion.getId(), e.getMessage());
                }

                eventPublisher.publishEvent(new SesionFinalizada(
                        sesion.getId(), "COLAPSADA", now));

                telemetriaService.emitirTelemetria(sesion);
                return true;
            }
        }
        return false;
    }

    /**
     * Colapso por incumplimiento del PRIMER SLA: una sesión HASTA_COLAPSO se detiene en cuanto
     * una maleta que ya entró al sistema supera su deadline (24h mismo continente / 48h distinto)
     * sin haber sido entregada — sin importar la causa (vuelos saturados que retrasan llegadas,
     * almacenes saturados, cancelaciones, falta de ruta dentro del SLA, etc.).
     */
    private boolean detectarIncumplimientoSla(SesionEjecucion sesion, OffsetDateTime now) {
        if (sesion.getTipoSimulacion() != TipoSimulacion.HASTA_COLAPSO) return false;
        OffsetDateTime virtual = sesion.getDiaHoraVirtual();
        if (virtual == null || sesion.getFechaInicioVirtual() == null) return false;

        // sla_comprometido / fecha_operacion viven en la línea temporal base de los archivos
        // (FECHA_BASE_ARCHIVO); el reloj virtual corre desde fechaInicioVirtual. Se compara en
        // la base restando el delta de días.
        long delta = ChronoUnit.DAYS.between(FECHA_BASE_ARCHIVO, sesion.getFechaInicioVirtual());
        OffsetDateTime limite = virtual.minusDays(delta);

        if (!equipajeRepository.existsIncumplimientoSla(limite)) return false;

        log.warn("COLAPSO por SLA en sesion {}: primer equipaje superó su deadline en virtual {}",
                sesion.getId(), virtual);

        sesion.setEstado(EstadoSesion.COLAPSADA);
        sesion.setFechaFinReal(now);
        sesionRepository.save(sesion);

        readinessManager.eliminar(sesion.getId());
        try {
            redisCacheService.setEstadoSesion(sesion.getId(), "COLAPSADA");
            redisCacheService.setMetricasSesion(sesion.getId(), buildMetricasJson(sesion, now, true));
        } catch (Exception e) {
            log.warn("Redis no disponible al colapsar sesion {}: {}", sesion.getId(), e.getMessage());
        }

        eventPublisher.publishEvent(new SesionFinalizada(
                sesion.getId(), "COLAPSADA", now));

        telemetriaService.emitirTelemetria(sesion);
        return true;
    }

    private void detenerSesionPorColapso(SesionEjecucion sesion, OffsetDateTime now) {
        log.info("Sesion {} colapsada - ticks detenidos", sesion.getId());
    }

    private void escribirMetricas(SesionEjecucion sesion, OffsetDateTime now) {
        String json = buildMetricasJson(sesion, now, false);
        redisCacheService.setMetricasSesion(sesion.getId(), json);
        redisCacheService.setEstadoSesion(sesion.getId(), sesion.getEstado().name());
    }

    private String buildMetricasJson(SesionEjecucion sesion, OffsetDateTime now, boolean colapsada) {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            root.put("sesion_id", sesion.getId().toString());
            root.put("estado", colapsada ? "COLAPSADA" : sesion.getEstado().name());
            root.put("dia_hora_virtual", sesion.getDiaHoraVirtual() != null
                    ? sesion.getDiaHoraVirtual().toString() : null);
            root.put("segundos_reales_transcurridos",
                    sesion.getSegundosRealesTranscurridos() != null ? sesion.getSegundosRealesTranscurridos() : 0);
            root.put("sla_acumulado_pct",
                    sesion.getSlaAcumuladoPct() != null ? sesion.getSlaAcumuladoPct().doubleValue() : 100.0);
            root.put("vuelos_cancelados",
                    sesion.getVuelosCancelados() != null ? sesion.getVuelosCancelados() : 0);
            root.put("maletas_replanificadas",
                    sesion.getMaletasReplanificadas() != null ? sesion.getMaletasReplanificadas() : 0);
            root.put("maletas_entregadas",
                    equipajeRepository.countByEstado(EstadoEquipaje.ENTREGADO));
            root.put("fecha_inicio_real", sesion.getFechaInicioReal() != null
                    ? sesion.getFechaInicioReal().toString() : null);
            root.put("timestamp", now.toString());
            return objectMapper.writeValueAsString(root);
        } catch (JsonProcessingException e) {
            log.error("Error building metrics JSON for session {}: {}", sesion.getId(), e.getMessage());
            return "{}";
        }
    }
}
