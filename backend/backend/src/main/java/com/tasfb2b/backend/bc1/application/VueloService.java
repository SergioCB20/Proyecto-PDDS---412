package com.tasfb2b.backend.bc1.application;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.PlanVuelos;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.infrastructure.EquipajeRepository;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import com.tasfb2b.backend.bc1.infrastructure.PlanVuelosRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class VueloService {

    private final VueloRepository vueloRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final EquipajeRepository equipajeRepository;
    private final PlanVuelosRepository planVuelosRepository;

    public VueloService(VueloRepository vueloRepository, NodoLogisticoRepository nodoRepository,
                        EquipajeRepository equipajeRepository, PlanVuelosRepository planVuelosRepository) {
        this.vueloRepository = vueloRepository;
        this.nodoRepository = nodoRepository;
        this.equipajeRepository = equipajeRepository;
        this.planVuelosRepository = planVuelosRepository;
    }

    public record CrearVueloRequest(
            String codigo_vuelo,
            UUID origen_id,
            UUID destino_id,
            OffsetDateTime hora_salida,
            OffsetDateTime hora_llegada,
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
            @JsonProperty("destino_lon") Double destinoLon
    ) {}

    public record OrigenDestinoResponse(UUID id, String codigoIata, String nombre) {}

    public record VueloPageResponse(
            java.util.List<VueloResponse> content,
            long totalElements,
            int totalPages
    ) {}

    public VueloPageResponse listar(String estado, String destinoIata, OffsetDateTime fechaDesde, OffsetDateTime fechaHasta, Pageable pageable) {
        Specification<Vuelo> spec = Specification.anyOf();

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
        vuelo.setHoraSalida(request.hora_salida());
        vuelo.setHoraLlegada(request.hora_llegada());
        vuelo.setCapacidadCarga(request.capacidad_carga());
        vuelo.setCargaDisponible(request.capacidad_carga());
        vuelo.setEstado(EstadoVuelo.PROGRAMADO);
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

        vuelo.setCodigoVuelo(request.codigo_vuelo());
        vuelo.setOrigen(origen);
        vuelo.setDestino(destino);
        vuelo.setOrigenLat(origen.getLatitud());
        vuelo.setOrigenLon(origen.getLongitud());
        vuelo.setDestinoLat(destino.getLatitud());
        vuelo.setDestinoLon(destino.getLongitud());
        vuelo.setHoraSalida(request.hora_salida());
        vuelo.setHoraLlegada(request.hora_llegada());
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
                vuelo.getDestino().getLongitud().doubleValue()
        );
    }

    public static class VueloNoEncontradoException extends RuntimeException {
        public VueloNoEncontradoException(String msg) { super(msg); }
    }

    public static class ValidacionException extends RuntimeException {
        public ValidacionException(String msg) { super(msg); }
    }
}
