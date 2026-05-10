package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class NodoService {

    private final NodoLogisticoRepository nodoRepository;

    public NodoService(NodoLogisticoRepository nodoRepository) {
        this.nodoRepository = nodoRepository;
    }

    public record NodoResponse(
            UUID id,
            String codigoIata,
            String nombre,
            Double latitud,
            Double longitud,
            Integer capacidadAlmacen,
            Integer ocupacionActual
    ) {}

    public List<NodoResponse> listarTodos() {
        return nodoRepository.findAllByOrderByCodigoIataAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public NodoResponse obtener(UUID id) {
        NodoLogistico nodo = nodoRepository.findById(id)
                .orElseThrow(() -> new NodoNoEncontradoException("Nodo no encontrado: " + id));
        return toResponse(nodo);
    }

    private NodoResponse toResponse(NodoLogistico nodo) {
        return new NodoResponse(
                nodo.getId(),
                nodo.getCodigoIata(),
                nodo.getNombre(),
                nodo.getLatitud().doubleValue(),
                nodo.getLongitud().doubleValue(),
                nodo.getCapacidadAlmacen(),
                nodo.getOcupacionActual()
        );
    }

    public static class NodoNoEncontradoException extends RuntimeException {
        public NodoNoEncontradoException(String msg) { super(msg); }
    }
}