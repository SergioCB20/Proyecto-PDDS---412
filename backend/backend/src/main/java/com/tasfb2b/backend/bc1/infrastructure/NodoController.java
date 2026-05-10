package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.NodoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/nodos")
public class NodoController {

    private final NodoService nodoService;

    public NodoController(NodoService nodoService) {
        this.nodoService = nodoService;
    }

    @GetMapping
    public ResponseEntity<List<NodoService.NodoResponse>> listar() {
        return ResponseEntity.ok(nodoService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> obtener(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(nodoService.obtener(id));
        } catch (NodoService.NodoNoEncontradoException e) {
            return ResponseEntity.notFound().build();
        }
    }
}