package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class VueloService {

    private final VueloRepository vueloRepository;

    public VueloService(VueloRepository vueloRepository) {
        this.vueloRepository = vueloRepository;
    }

    public record VueloResponse(
            UUID id,
            String codigoVuelo,
            String estado,
            OrigenDestinoResponse origen,
            OrigenDestinoResponse destino,
            OffsetDateTime horaSalida,
            OffsetDateTime horaLlegada,
            Integer capacidadCarga,
            Integer cargaDisponible
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
                vuelo.getCargaDisponible()
        );
    }

    public static class VueloNoEncontradoException extends RuntimeException {
        public VueloNoEncontradoException(String msg) { super(msg); }
    }
}