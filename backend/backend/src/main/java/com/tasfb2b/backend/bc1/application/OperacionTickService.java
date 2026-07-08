package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.domain.*;
import com.tasfb2b.backend.bc1.infrastructure.*;
import com.tasfb2b.backend.bc2.domain.EstadoSesion;
import com.tasfb2b.backend.bc2.infrastructure.SesionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
public class OperacionTickService {

    private static final Logger log = LoggerFactory.getLogger(OperacionTickService.class);
    private static final LocalDate FECHA_OPERACION = LocalDate.of(2026, 1, 15);

    private volatile boolean activo = false;
    private volatile LocalDate diaProcesado = null;
    private volatile boolean procesarLlegadas = false;
    private volatile String dispositivoId;
    private volatile long inicioTimestamp; // System.currentTimeMillis() al iniciar

    private final VueloRepository vueloRepository;
    private final EquipajeRepository equipajeRepository;
    private final SegmentoPlanRepository segmentoPlanRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final VueloService vueloService;
    private final OperacionTelemetriaService operacionTelemetriaService;
    private final SesionRepository sesionRepository;
    private final JdbcTemplate jdbcTemplate;
    private final OcupacionNodoService ocupacionNodoService;

    public OperacionTickService(VueloRepository vueloRepository,
                                 EquipajeRepository equipajeRepository,
                                 SegmentoPlanRepository segmentoPlanRepository,
                                 NodoLogisticoRepository nodoRepository,
                                 VueloService vueloService,
                                 OperacionTelemetriaService operacionTelemetriaService,
                                 SesionRepository sesionRepository,
                                 JdbcTemplate jdbcTemplate,
                                 OcupacionNodoService ocupacionNodoService) {
        this.vueloRepository = vueloRepository;
        this.equipajeRepository = equipajeRepository;
        this.segmentoPlanRepository = segmentoPlanRepository;
        this.nodoRepository = nodoRepository;
        this.vueloService = vueloService;
        this.operacionTelemetriaService = operacionTelemetriaService;
        this.sesionRepository = sesionRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.ocupacionNodoService = ocupacionNodoService;
    }

    public String getEstado() { return activo ? "ACTIVO" : "INACTIVO"; }

    public String getDispositivoId() { return dispositivoId; }

    public boolean esPropietario(String deviceId) {
        if (dispositivoId == null) return true; // backward compat
        return deviceId != null && deviceId.equals(dispositivoId);
    }

    @Transactional
    public void iniciar(String deviceId) {
        resetOperacion();
        this.dispositivoId = deviceId;
        this.inicioTimestamp = System.currentTimeMillis();
        this.activo = true;
        log.info("Operacion iniciada por dispositivo {}", deviceId);
    }

    public void pausar() {
        this.activo = false;
        log.info("Operacion pausada");
    }

    public void reanudar() {
        this.activo = true;
        log.info("Operacion reanudada");
    }

    @Transactional
    public void detener() {
        resetOperacion();
        this.dispositivoId = null;
        this.inicioTimestamp = 0;
        this.activo = false;
        log.info("Operacion detenida y reiniciada");
    }

    @Transactional
    public void resetOperacion() {
        if (vueloService.existenInstanciasParaFecha(FECHA_OPERACION)) {
            vueloService.resetearInstanciasPorFecha(FECHA_OPERACION);
        }
        jdbcTemplate.update("DELETE FROM segmentos_plan WHERE plan_viaje_id IN (SELECT id FROM planes_viaje WHERE sesion_id IS NULL)");
        jdbcTemplate.update("DELETE FROM planes_viaje WHERE sesion_id IS NULL");
        jdbcTemplate.update(
            "UPDATE equipajes SET estado = 'REGISTRADO', vuelo_actual_id = NULL " +
            "WHERE estado IN ('EN_VUELO', 'EN_ALMACEN') " +
            "AND id NOT IN (SELECT equipaje_id FROM planes_viaje WHERE sesion_id IS NOT NULL)"
        );
        ocupacionNodoService.reset(OcupacionNodoService.OPERACION);
        this.diaProcesado = null;
    }

    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void tick() {
        try {
            // El clonado/reseteo de vuelos debe ocurrir aunque el toggle esté OFF,
            // para que PlanificacionWorker tenga vuelos PROGRAMADO para rutear.
            // NO se eliminan instancias (eso rompería PlanViaje activos).
            // Si ya existen instancias en EN_RUTA/COMPLETADO (de runs anteriores con toggle ON),
            // se resetean a PROGRAMADO con capacidad completa.
            // Si no existen, se clonan desde las plantillas.
            if (sesionRepository.findByEstado(EstadoSesion.EN_CURSO).isEmpty()) {
                if (!FECHA_OPERACION.equals(diaProcesado)) {
                    if (vueloService.existenInstanciasParaFecha(FECHA_OPERACION)) {
                        vueloService.resetearInstanciasPorFecha(FECHA_OPERACION);
                    } else {
                        int clonadas = vueloService.clonarPlantillas(FECHA_OPERACION);
                        if (clonadas > 0) {
                            log.info("Operacion: {} vuelos clonados para {}", clonadas, FECHA_OPERACION);
                        }
                    }
                    diaProcesado = FECHA_OPERACION;
                }
            }

            if (!activo) return;
            if (!sesionRepository.findByEstado(EstadoSesion.EN_CURSO).isEmpty()) return;

            // Auto-detener tras 4 horas de actividad si nadie lo detiene
            if (inicioTimestamp > 0 && System.currentTimeMillis() - inicioTimestamp >= 4 * 3600 * 1000L) {
                log.info("Operacion alcanzó 4 horas de actividad. Deteniendo automaticamente.");
                detener();
                return;
            }

            OffsetDateTime now = OffsetDateTime.of(
                    FECHA_OPERACION, OffsetDateTime.now(ZoneOffset.UTC).toLocalTime(), ZoneOffset.UTC);

            procesarSalidas(now);
            procesarLlegadas = !procesarLlegadas;
            if (procesarLlegadas) {
                procesarLlegadas(now);
            }

            operacionTelemetriaService.emitirTelemetria();
        } catch (Exception e) {
            log.error("Error in operational tick: {}", e.getMessage(), e);
        }
    }

    private void procesarSalidas(OffsetDateTime now) {
        List<Vuelo> saliendo = vueloRepository.findByEstadoAndEsPlantillaAndHoraSalidaLessThanEqual(
                EstadoVuelo.PROGRAMADO, false, now);

        if (saliendo.isEmpty()) return;

        List<Vuelo> vuelosActualizar = new ArrayList<>();
        List<SegmentoPlan> segmentosActualizar = new ArrayList<>();
        List<Equipaje> equipajesActualizar = new ArrayList<>();
        Map<UUID, Integer> nodosCarga = new HashMap<>();

        for (Vuelo vuelo : saliendo) {
            vuelo.setEstado(EstadoVuelo.EN_RUTA);

            NodoLogistico origen = vuelo.getOrigen();

            List<SegmentoPlan> segmentos = segmentoPlanRepository.findByVueloIdAndEstado(
                    vuelo.getId(), EstadoSegmento.PENDIENTE);

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

            int capacidad = vuelo.getCapacidadCarga() != null ? vuelo.getCapacidadCarga() : 0;
            vuelo.setCargaDisponible(Math.max(0, capacidad - abordando));
            vuelosActualizar.add(vuelo);
        }

        vueloRepository.saveAll(vuelosActualizar);
        segmentoPlanRepository.saveAll(segmentosActualizar);
        equipajeRepository.saveAll(equipajesActualizar);

        // Al abordar, las maletas dejan el almacén de origen (contexto de operación día a día).
        for (Map.Entry<UUID, Integer> entry : nodosCarga.entrySet()) {
            ocupacionNodoService.ajustar(entry.getKey(), OcupacionNodoService.OPERACION, -entry.getValue());
        }
    }

    private void procesarLlegadas(OffsetDateTime now) {
        List<Vuelo> llegando = vueloRepository.findByEstadoAndEsPlantillaAndHoraLlegadaLessThanEqual(
                EstadoVuelo.EN_RUTA, false, now);

        if (llegando.isEmpty()) return;

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

        // Las maletas en tránsito (EN_ALMACEN) ocupan el almacén de destino (contexto de operación).
        for (Map.Entry<UUID, Integer> entry : nodosCarga.entrySet()) {
            ocupacionNodoService.ajustar(entry.getKey(), OcupacionNodoService.OPERACION, entry.getValue());
        }
    }
}
