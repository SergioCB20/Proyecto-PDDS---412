package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
import com.tasfb2b.backend.bc2.application.ReplanificacionResult;
import com.tasfb2b.backend.bc2.application.ReplanificacionService;
import com.tasfb2b.backend.bc2.application.SesionLockManager;
import com.tasfb2b.backend.bc2.domain.SesionEjecucion;
import com.tasfb2b.backend.bc2.infrastructure.SesionRepository;
import com.tasfb2b.backend.shared.events.VueloCanceladoEvent;
import com.tasfb2b.backend.shared.infrastructure.RedisCacheService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

import com.tasfb2b.backend.bc2.application.EquipajeReplanInfo;
import com.tasfb2b.backend.bc2.application.SegmentoReplanInfo;
import com.tasfb2b.backend.bc2.domain.EventoCancelacion;
import com.tasfb2b.backend.bc2.infrastructure.EventoCancelacionRepository;

@Service
public class CancelacionService {

    private static final Logger log = LoggerFactory.getLogger(CancelacionService.class);

    private final VueloRepository vueloRepository;
    private final EquipajeRepository equipajeRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final RedisCacheService redisCacheService;
    private final ReplanificacionService replanificacionService;
    private final SesionRepository sesionRepository;
    private final SesionLockManager lockManager;
    private final OcupacionNodoService ocupacionNodoService;
    private final VueloService vueloService;
    private final EventoCancelacionRepository eventoCancelacionRepository;

    public CancelacionService(VueloRepository vueloRepository, EquipajeRepository equipajeRepository,
                              NodoLogisticoRepository nodoRepository, ApplicationEventPublisher eventPublisher,
                              RedisCacheService redisCacheService,
                              ReplanificacionService replanificacionService,
                              SesionRepository sesionRepository,
                              SesionLockManager lockManager,
                              OcupacionNodoService ocupacionNodoService,
                              VueloService vueloService,
                              EventoCancelacionRepository eventoCancelacionRepository) {
        this.vueloRepository = vueloRepository;
        this.equipajeRepository = equipajeRepository;
        this.nodoRepository = nodoRepository;
        this.eventPublisher = eventPublisher;
        this.redisCacheService = redisCacheService;
        this.replanificacionService = replanificacionService;
        this.sesionRepository = sesionRepository;
        this.lockManager = lockManager;
        this.ocupacionNodoService = ocupacionNodoService;
        this.vueloService = vueloService;
        this.eventoCancelacionRepository = eventoCancelacionRepository;
    }

    public record EquipajeAfectado(UUID id, String codigo, String origen_iata, String destino_iata,
                                    UUID vuelo_replanificado_id, String vuelo_replanificado_codigo,
                                    List<SegmentoReplanInfo> plan_viaje) {}

    public record CancelacionRequest(UUID vuelo_id, String causa, UUID sesion_id, Boolean aplicar_regla_plantilla) {
        public CancelacionRequest {
            if (aplicar_regla_plantilla == null) aplicar_regla_plantilla = false;
        }
    }

    public record CancelacionResponse(
            UUID vuelo_id,
            String estado_nuevo,
            int equipajes_afectados,
            UUID lote_replanificacion_id,
            List<EquipajeAfectado> equipajes,
            LocalDate fecha_operacion,
            OffsetDateTime hora_salida_cancelada
    ) {}

    @Transactional
    public CancelacionResponse cancelar(CancelacionRequest request) {
        // Regla nueva para plantillas: bifurcacion hoy/mañana segun tiempo virtual.
        // Se aplica solo dentro de una sesion (la rama legacy no-sesion opera sobre
        // instancias reales del dia).
        if (request.aplicar_regla_plantilla() && request.sesion_id() != null) {
            return cancelarSegunPlantilla(request);
        }

        Vuelo vuelo = vueloRepository.findById(request.vuelo_id())
                .orElseThrow(() -> new VueloNoEncontradoException("Vuelo no encontrado: " + request.vuelo_id()));

        if (vuelo.getEstado() != EstadoVuelo.PROGRAMADO && vuelo.getEstado() != EstadoVuelo.EN_RUTA) {
            throw new CancelacionInvalidaException("No se puede cancelar vuelo en estado: " + vuelo.getEstado());
        }

        // Cancelacion DENTRO de una simulacion: usa el mismo camino que la cancelacion
        // probabilistica del tick (replanificarEnSesion). Ese metodo captura tanto las
        // maletas EN_VUELO como las ENRUTADO con segmento PENDIENTE (las de un vuelo
        // PROGRAMADO que aun no despega) y las re-encola para armar un nuevo plan. El
        // camino legacy (VueloCanceladoEvent) solo reencola EN_VUELO, dejando huerfanas
        // las ENRUTADO -> se apilan en el nodo y la simulacion colapsa.
        if (request.sesion_id() != null) {
            return cancelarEnSimulacion(vuelo, request.sesion_id(), request.causa());
        }

        // Camino legacy (operacion real, sin sesion).
        int afectados = (int) equipajeRepository.countByVueloActualId(vuelo.getId());

        vuelo.setEstado(EstadoVuelo.CANCELADO);
        vueloRepository.save(vuelo);

        redisCacheService.actualizarCargaDisponibleVuelo(vuelo.getId(), 0);
        // Ruta legacy = operación día a día: refresca el caché con la ocupación del contexto de
        // operación (ya no el contador global obsoleto nodos_logisticos.ocupacion_actual).
        for (NodoLogistico nodo : nodoRepository.findAllByOrderByCodigoIataAsc()) {
            redisCacheService.actualizarOcupacionNodo(
                    nodo.getId(), ocupacionNodoService.leer(nodo.getId(), OcupacionNodoService.OPERACION));
        }

        eventPublisher.publishEvent(new VueloCanceladoEvent(vuelo.getId(), OffsetDateTime.now(), request.causa()));

        return new CancelacionResponse(
                vuelo.getId(),
                "CANCELADO",
                afectados,
                UUID.randomUUID(),
                List.of(),
                null,
                null
        );
    }

    private CancelacionResponse cancelarEnSimulacion(Vuelo vuelo, UUID sesionId, String causa) {
        SesionEjecucion sesion = sesionRepository.findById(sesionId)
                .orElseThrow(() -> new CancelacionInvalidaException("Sesion no encontrada: " + sesionId));

        ReentrantLock lock = lockManager.obtener(sesionId);
        lock.lock();
        try {
            return cancelarEnSimulacionLocked(sesion, vuelo, causa);
        } finally {
            lock.unlock();
        }
    }

    /**
     * Cuerpo limpio (sin lock) de la cancelacion en sesion: ya que el caller externo
     * (cancelarEnSimulacion o cancelarSegunPlantilla) tomo el lock, aqui solo se hace
     * replan + bookkeeping + armado de respuesta.
     */
    private CancelacionResponse cancelarEnSimulacionLocked(
            SesionEjecucion sesion, Vuelo vuelo, String causa) {
        OffsetDateTime virtual = sesion.getDiaHoraVirtual() != null
                ? sesion.getDiaHoraVirtual() : OffsetDateTime.now();
        String causaFinal = causa != null ? causa : "Cancelacion manual";
        UUID sesionId = sesion.getId();

        ReplanificacionResult result = replanificacionService.replanificarEnSesion(
                sesionId, vuelo.getId(), causaFinal, virtual);

        sesion.setVuelosCancelados(
                (sesion.getVuelosCancelados() != null ? sesion.getVuelosCancelados() : 0) + 1);
        sesion.setMaletasReplanificadas(
                (sesion.getMaletasReplanificadas() != null ? sesion.getMaletasReplanificadas() : 0) + result.afectados());
        sesionRepository.save(sesion);

        List<Equipaje> eqs = equipajeRepository.findAllById(result.equipajeIds());
        Map<UUID, EquipajeReplanInfo> replanMap = result.equipajes().stream()
                .collect(Collectors.toMap(EquipajeReplanInfo::id, r -> r));
        List<EquipajeAfectado> equipajes = eqs.stream()
                .map(e -> {
                    EquipajeReplanInfo ri = replanMap.get(e.getId());
                    if (ri != null) {
                        return new EquipajeAfectado(e.getId(),
                                e.getIdExterno() != null ? e.getIdExterno() : e.getId().toString(),
                                e.getOrigenIata(), e.getDestinoIata(),
                                ri.vueloId(), ri.vueloCodigo(),
                                ri.segmentos());
                    }
                    return new EquipajeAfectado(e.getId(),
                            e.getIdExterno() != null ? e.getIdExterno() : e.getId().toString(),
                            e.getOrigenIata(), e.getDestinoIata(),
                            null, null, List.of());
                })
                .toList();

        return new CancelacionResponse(vuelo.getId(), "CANCELADO",
                result.afectados(), result.loteId(), equipajes, null, null);
    }

    /**
     * Regla nueva para plantillas (panel "Cancelacion" del modo simulacion):
     *   - Si el reloj virtual esta a mas de 1h antes de la hora canonica de salida
     *     de la plantilla -> cancela la instancia de HOY (+replan, mismo camino que hoy).
     *   - Si esta a 1h o menos (o ya en el pasado) -> cancela la instancia de MAÑANA
     *     SIN replan. Solo incrementa vuelosCancelados; los equipajes actualmente en el
     *     vuelo de hoy siguen su curso.
     * Devuelve 422 si la sesion no tiene reloj virtual.
     */
    @Transactional
    public CancelacionResponse cancelarSegunPlantilla(CancelacionRequest request) {
        UUID sesionId = request.sesion_id();
        SesionEjecucion sesion = sesionRepository.findById(sesionId)
                .orElseThrow(() -> new CancelacionInvalidaException("Sesion no encontrada: " + sesionId));

        Vuelo plantilla = vueloRepository.findById(request.vuelo_id())
                .orElseThrow(() -> new VueloNoEncontradoException("Vuelo no encontrado: " + request.vuelo_id()));
        if (!Boolean.TRUE.equals(plantilla.getEsPlantilla())) {
            throw new CancelacionInvalidaException(
                    "Solo se puede aplicar la regla de horario a vuelos plantilla");
        }

        OffsetDateTime virtual = sesion.getDiaHoraVirtual();
        if (virtual == null) {
            throw new CancelacionInvalidaException(
                    "La sesion no tiene reloj virtual; inicia la sesion para poder cancelar plantillas");
        }

        String causaFinal = request.causa() != null ? request.causa() : "Cancelacion manual desde panel de plantillas";

        ReentrantLock lock = lockManager.obtener(sesionId);
        lock.lock();
        try {
            // Re-anclar la hora de la plantilla al día virtual actual. La columna
            // vuelos.hora_salida en las plantillas es un TIMESTAMPTZ absoluto que
            // apunta al día 1 de la migración V20 (2026-01-15 / 2026-01-16). Para
            // comparar correctamente con el reloj virtual cuando han pasado varios
            // días virtuales, tomamos la hora-del-día de la plantilla y la ponemos
            // sobre la fecha virtual actual antes de medir la diferencia.
            OffsetDateTime plantillaEnHoy = OffsetDateTime.of(
                    virtual.toLocalDate(),
                    plantilla.getHoraSalida().toLocalTime(),
                    plantilla.getHoraSalida().getOffset());
            long minutosHastaSalida = Duration.between(virtual, plantillaEnHoy).toMinutes();

            if (minutosHastaSalida >= 60) {
                // Caso FRIO: cancelar la instancia de hoy + replan (comportamiento existente).
                Vuelo instanciaHoy = vueloService.obtenerInstanciaDelDia(
                        plantilla.getCodigoVuelo(), virtual.toLocalDate());
                if (instanciaHoy == null) {
                    // Sin plantilla ya clonada para hoy -> improbable porque la sesion clona al
                    // iniciar, pero defensivo: tratamos como caliente (no replan, bloque siguiente dia).
                    log.warn("cancelarSegunPlantilla: instancia de hoy no encontrada para {} (codigo={}); cae a rama caliente",
                            virtual.toLocalDate(), plantilla.getCodigoVuelo());
                    return cancelarInstanciaSiguienteLocked(sesion, plantilla, virtual, causaFinal);
                }
                return cancelarEnSimulacionLocked(sesion, instanciaHoy, causaFinal);
            }

            // Caso CALIENTE: cancelar la instancia del dia siguiente SIN replan.
            return cancelarInstanciaSiguienteLocked(sesion, plantilla, virtual, causaFinal);
        } finally {
            lock.unlock();
        }
    }

    private CancelacionResponse cancelarInstanciaSiguienteLocked(
            SesionEjecucion sesion, Vuelo plantilla, OffsetDateTime virtual, String causaFinal) {
        UUID sesionId = sesion.getId();
        LocalDate manana = virtual.toLocalDate().plusDays(1);
        Vuelo instanciaManana = vueloService.obtenerInstanciaDelDia(plantilla.getCodigoVuelo(), manana);
        if (instanciaManana == null) {
            throw new CancelacionInvalidaException(
                    "No hay instancia del dia siguiente para " + plantilla.getCodigoVuelo());
        }

        instanciaManana.setEstado(EstadoVuelo.CANCELADO);
        vueloRepository.save(instanciaManana);

        redisCacheService.actualizarCargaDisponibleVuelo(instanciaManana.getId(), 0);

        EventoCancelacion evento = new EventoCancelacion(
                UUID.randomUUID(), sesionId, instanciaManana.getId(), "SIMULACION_PROXIMO_DIA");
        evento.setCausa(causaFinal);
        evento.setOcurridoEnVirtual(virtual);
        eventoCancelacionRepository.save(evento);

        sesion.setVuelosCancelados(
                (sesion.getVuelosCancelados() != null ? sesion.getVuelosCancelados() : 0) + 1);
        sesionRepository.save(sesion);

        log.info("Cancelacion diferida (rama caliente): plantilla={} sesion={} instancia_cancelada={} proxDia={}",
                plantilla.getCodigoVuelo(), sesionId, instanciaManana.getId(), manana);

        return new CancelacionResponse(
                instanciaManana.getId(),
                "CANCELADO",
                0,
                null,
                List.of(),
                instanciaManana.getFechaOperacion(),
                instanciaManana.getHoraSalida());
    }

    public static class VueloNoEncontradoException extends RuntimeException {
        public VueloNoEncontradoException(String msg) { super(msg); }
    }

    public static class CancelacionInvalidaException extends RuntimeException {
        public CancelacionInvalidaException(String msg) { super(msg); }
    }
}