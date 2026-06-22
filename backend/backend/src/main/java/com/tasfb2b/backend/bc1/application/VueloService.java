package com.tasfb2b.backend.bc1.application;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.PlanVuelos;
import com.tasfb2b.backend.bc1.domain.SegmentoPlan;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import com.tasfb2b.backend.bc1.infrastructure.PlanVuelosRepository;
import com.tasfb2b.backend.bc1.infrastructure.SegmentoPlanRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class VueloService {

    private static final Logger log = LoggerFactory.getLogger(VueloService.class);

    private final VueloRepository vueloRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final EquipajeRepository equipajeRepository;
    private final PlanVuelosRepository planVuelosRepository;
    private final SegmentoPlanRepository segmentoPlanRepository;
    private final JdbcTemplate jdbcTemplate;

    public VueloService(VueloRepository vueloRepository, NodoLogisticoRepository nodoRepository,
                        EquipajeRepository equipajeRepository, PlanVuelosRepository planVuelosRepository,
                        SegmentoPlanRepository segmentoPlanRepository,
                        JdbcTemplate jdbcTemplate) {
        this.vueloRepository = vueloRepository;
        this.nodoRepository = nodoRepository;
        this.equipajeRepository = equipajeRepository;
        this.planVuelosRepository = planVuelosRepository;
        this.segmentoPlanRepository = segmentoPlanRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    public record CrearVueloRequest(
            String codigo_vuelo,
            UUID origen_id,
            UUID destino_id,
            LocalDateTime hora_salida,
            LocalDateTime hora_llegada,
            Integer capacidad_carga
    ) {}

    public record VueloResponse(
            UUID id,
            @JsonProperty("codigo_vuelo") String codigoVuelo,
            String estado,
            OrigenDestinoResponse origen,
            OrigenDestinoResponse destino,
            @JsonProperty("hora_salida") OffsetDateTime horaSalida,
            @JsonProperty("hora_llegada") OffsetDateTime horaLlegada,
            @JsonProperty("capacidad_carga") Integer capacidadCarga,
            @JsonProperty("carga_disponible") Integer cargaDisponible,
            @JsonProperty("origen_lat") Double origenLat,
            @JsonProperty("origen_lon") Double origenLon,
            @JsonProperty("destino_lat") Double destinoLat,
            @JsonProperty("destino_lon") Double destinoLon,
            @JsonProperty("es_plantilla") Boolean esPlantilla,
            @JsonProperty("fecha_operacion") String fechaOperacion
    ) {}

    public record OrigenDestinoResponse(UUID id, @JsonProperty("codigo_iata") String codigoIata, String nombre) {}

    public record VueloPageResponse(
            java.util.List<VueloResponse> content,
            long totalElements,
            int totalPages
    ) {}

    public VueloPageResponse listar(String estado, String destinoIata, OffsetDateTime fechaDesde, OffsetDateTime fechaHasta, Boolean esPlantilla, Pageable pageable) {
        Specification<Vuelo> spec = (root, query, cb) -> cb.conjunction();

        if (esPlantilla != null) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(root.get("esPlantilla"), esPlantilla));
        }

        if (estado != null && !estado.isBlank()) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(root.get("estado"), EstadoVuelo.valueOf(estado)));
        }

        if (fechaDesde != null && fechaHasta != null) {
            spec = spec.and((root, query, cb) ->
                    cb.between(root.get("horaSalida"), fechaDesde, fechaHasta));
        }

        if (destinoIata != null && !destinoIata.isBlank()) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(root.get("destino").get("codigoIata"), destinoIata));
        }

        Page<Vuelo> page = vueloRepository.findAll(spec, pageable);

        java.util.List<VueloResponse> content = page.getContent().stream()
                .map(this::toResponse)
                .toList();

        return new VueloPageResponse(content, page.getTotalElements(), page.getTotalPages());
    }

    public VueloResponse obtener(UUID id) {
        Vuelo vuelo = vueloRepository.findById(id)
                .orElseThrow(() -> new VueloNoEncontradoException("Vuelo no encontrado: " + id));
        return toResponse(vuelo);
    }

    @Transactional
    public VueloResponse crear(CrearVueloRequest request) {
        NodoLogistico origen = nodoRepository.findById(request.origen_id())
                .orElseThrow(() -> new ValidacionException("Origen no encontrado"));
        NodoLogistico destino = nodoRepository.findById(request.destino_id())
                .orElseThrow(() -> new ValidacionException("Destino no encontrado"));

        PlanVuelos planVuelos = planVuelosRepository.findFirstByOrderByVigenciaDesdeAsc()
                .orElseThrow(() -> new ValidacionException("No hay plan de vuelos activo"));

        Vuelo vuelo = new Vuelo();
        vuelo.setId(UUID.randomUUID());
        vuelo.setPlanVuelos(planVuelos);
        vuelo.setCodigoVuelo(request.codigo_vuelo());
        vuelo.setOrigen(origen);
        vuelo.setDestino(destino);
        vuelo.setOrigenLat(origen.getLatitud());
        vuelo.setOrigenLon(origen.getLongitud());
        vuelo.setDestinoLat(destino.getLatitud());
        vuelo.setDestinoLon(destino.getLongitud());
        ZoneId zonaOrigen = ZoneId.of(origen.getZonaHoraria());
        ZoneId zonaDestino = ZoneId.of(destino.getZonaHoraria());

        vuelo.setHoraSalida(request.hora_salida().atZone(zonaOrigen).toOffsetDateTime());
        vuelo.setHoraLlegada(request.hora_llegada().atZone(zonaDestino).toOffsetDateTime());
        vuelo.setCapacidadCarga(request.capacidad_carga());
        vuelo.setCargaDisponible(request.capacidad_carga());
        vuelo.setEstado(EstadoVuelo.PROGRAMADO);
        vuelo.setEsPlantilla(false);
        vuelo.setFechaOperacion(request.hora_salida().toLocalDate());
        vueloRepository.save(vuelo);

        return toResponse(vuelo);
    }

    @Transactional
    public VueloResponse actualizar(UUID id, CrearVueloRequest request) {
        Vuelo vuelo = vueloRepository.findById(id)
                .orElseThrow(() -> new VueloNoEncontradoException("Vuelo no encontrado: " + id));

        if (vuelo.getEstado() != EstadoVuelo.PROGRAMADO) {
            throw new ValidacionException("Solo se puede modificar un vuelo PROGRAMADO");
        }

        NodoLogistico origen = nodoRepository.findById(request.origen_id())
                .orElseThrow(() -> new ValidacionException("Origen no encontrado"));
        NodoLogistico destino = nodoRepository.findById(request.destino_id())
                .orElseThrow(() -> new ValidacionException("Destino no encontrado"));

        ZoneId zonaOrigen = ZoneId.of(origen.getZonaHoraria());
        ZoneId zonaDestino = ZoneId.of(destino.getZonaHoraria());

        vuelo.setCodigoVuelo(request.codigo_vuelo());
        vuelo.setOrigen(origen);
        vuelo.setDestino(destino);
        vuelo.setOrigenLat(origen.getLatitud());
        vuelo.setOrigenLon(origen.getLongitud());
        vuelo.setDestinoLat(destino.getLatitud());
        vuelo.setDestinoLon(destino.getLongitud());
        vuelo.setHoraSalida(request.hora_salida().atZone(zonaOrigen).toOffsetDateTime());
        vuelo.setHoraLlegada(request.hora_llegada().atZone(zonaDestino).toOffsetDateTime());
        vuelo.setCapacidadCarga(request.capacidad_carga());
        vuelo.setCargaDisponible(request.capacidad_carga());
        vueloRepository.save(vuelo);

        return toResponse(vuelo);
    }

    @Transactional
    public void eliminar(UUID id) {
        Vuelo vuelo = vueloRepository.findById(id)
                .orElseThrow(() -> new VueloNoEncontradoException("Vuelo no encontrado: " + id));

        if (vuelo.getEstado() != EstadoVuelo.PROGRAMADO) {
            throw new ValidacionException("Solo se puede eliminar un vuelo PROGRAMADO");
        }

        long equipajesAsignados = equipajeRepository.countByVueloActualId(id);
        if (equipajesAsignados > 0) {
            throw new ValidacionException("No se puede eliminar un vuelo con equipajes asignados");
        }

        vueloRepository.delete(vuelo);
    }

    private VueloResponse toResponse(Vuelo vuelo) {
        return new VueloResponse(
                vuelo.getId(),
                vuelo.getCodigoVuelo(),
                vuelo.getEstado().name(),
                new OrigenDestinoResponse(
                        vuelo.getOrigen().getId(),
                        vuelo.getOrigen().getCodigoIata(),
                        vuelo.getOrigen().getNombre()
                ),
                new OrigenDestinoResponse(
                        vuelo.getDestino().getId(),
                        vuelo.getDestino().getCodigoIata(),
                        vuelo.getDestino().getNombre()
                ),
                vuelo.getHoraSalida(),
                vuelo.getHoraLlegada(),
                vuelo.getCapacidadCarga(),
                vuelo.getCargaDisponible(),
                vuelo.getOrigen().getLatitud().doubleValue(),
                vuelo.getOrigen().getLongitud().doubleValue(),
                vuelo.getDestino().getLatitud().doubleValue(),
                vuelo.getDestino().getLongitud().doubleValue(),
                vuelo.getEsPlantilla(),
                vuelo.getFechaOperacion() != null ? vuelo.getFechaOperacion().toString() : null
        );
    }

    public boolean existenInstanciasParaFecha(LocalDate fechaOperacion) {
        return vueloRepository.countByFechaOperacionAndEsPlantilla(fechaOperacion, false) > 0;
    }

    @Transactional
    public int clonarPlantillas(LocalDate fechaOperacion) {
        if (vueloRepository.existsByFechaOperacionAndEsPlantilla(fechaOperacion, false)) {
            log.info("Ya existen instancias para fecha {}, omitiendo clonacion", fechaOperacion);
            return 0;
        }

        List<Vuelo> plantillas = vueloRepository.findDistinctPlantillas();
        List<Vuelo> instancias = new ArrayList<>(plantillas.size());

        for (Vuelo plantilla : plantillas) {
            Vuelo instancia = new Vuelo();
            instancia.setId(UUID.randomUUID());
            instancia.setPlanVuelos(plantilla.getPlanVuelos());
            instancia.setCodigoVuelo(plantilla.getCodigoVuelo());
            instancia.setOrigen(plantilla.getOrigen());
            instancia.setDestino(plantilla.getDestino());
            instancia.setOrigenLat(plantilla.getOrigenLat());
            instancia.setOrigenLon(plantilla.getOrigenLon());
            instancia.setDestinoLat(plantilla.getDestinoLat());
            instancia.setDestinoLon(plantilla.getDestinoLon());
            instancia.setCapacidadCarga(plantilla.getCapacidadCarga());
            instancia.setCargaDisponible(plantilla.getCapacidadCarga());
            instancia.setHoraSalida(OffsetDateTime.of(
                    fechaOperacion,
                    plantilla.getHoraSalida().toLocalTime(),
                    plantilla.getHoraSalida().getOffset()));
            instancia.setHoraLlegada(OffsetDateTime.of(
                    fechaOperacion,
                    plantilla.getHoraLlegada().toLocalTime(),
                    plantilla.getHoraLlegada().getOffset()));
            instancia.setEstado(EstadoVuelo.PROGRAMADO);
            instancia.setEsPlantilla(false);
            instancia.setFechaOperacion(fechaOperacion);
            instancias.add(instancia);
        }

        vueloRepository.saveAll(instancias);

        log.info("Clonadas {} plantillas para fecha {}", plantillas.size(), fechaOperacion);
        return plantillas.size();
    }

    @Transactional
    public void eliminarInstanciasPorFecha(LocalDate desde, LocalDate hasta) {
        // Contar instancias sin cargarlas en memoria
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM vuelos WHERE es_plantilla = false AND fecha_operacion BETWEEN ? AND ?",
            Integer.class, desde, hasta);
        if (count == null || count == 0) {
            log.info("No hay instancias de simulacion para limpiar entre {} y {}", desde, hasta);
            return;
        }
        log.info("Limpiando {} instancias de simulacion entre {} y {}", count, desde, hasta);

        // Nullificar vuelo_actual_id usando JOIN directo (índice idx_equipajes_vuelo_actual)
        int equipajesNullificados = jdbcTemplate.update(
            "UPDATE equipajes SET vuelo_actual_id = NULL " +
            "WHERE vuelo_actual_id IN (" +
            "  SELECT id FROM vuelos WHERE es_plantilla = false AND fecha_operacion BETWEEN ? AND ?" +
            ")", desde, hasta);

        // Eliminar segmentos usando JOIN directo (índice idx_segmentos_vuelo_id)
        int segmentosEliminados = jdbcTemplate.update(
            "DELETE FROM segmentos_plan WHERE vuelo_id IN (" +
            "  SELECT id FROM vuelos WHERE es_plantilla = false AND fecha_operacion BETWEEN ? AND ?" +
            ")", desde, hasta);

        // Eliminar las instancias de vuelo
        jdbcTemplate.update(
            "DELETE FROM vuelos WHERE es_plantilla = false AND fecha_operacion BETWEEN ? AND ?",
            desde, hasta);

        log.info("Limpiadas {} instancias ({} equipajes nullificados, {} segmentos eliminados)",
                count, equipajesNullificados, segmentosEliminados);
    }

    @Transactional
    public int resetearInstanciasPorFecha(LocalDate fechaOperacion) {
        int actualizados = jdbcTemplate.update(
            "UPDATE vuelos SET estado = ?, carga_disponible = capacidad_carga " +
            "WHERE es_plantilla = false AND fecha_operacion = ? AND estado != ?",
            EstadoVuelo.PROGRAMADO.name(), fechaOperacion, EstadoVuelo.PROGRAMADO.name());
        if (actualizados > 0) {
            log.info("Operacion: {} vuelos reseteados a PROGRAMADO para fecha {}", actualizados, fechaOperacion);
        }
        return actualizados;
    }

    public static class VueloNoEncontradoException extends RuntimeException {
        public VueloNoEncontradoException(String msg) { super(msg); }
    }

    public static class ValidacionException extends RuntimeException {
        public ValidacionException(String msg) { super(msg); }
    }
}
