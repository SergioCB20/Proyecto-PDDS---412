package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.NodoService;
import com.tasfb2b.backend.bc1.application.EquipajeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/nodos")
public class NodoController {

    private final NodoService nodoService;
    private final EquipajeService equipajeService;

    public NodoController(NodoService nodoService, EquipajeService equipajeService) {
        this.nodoService = nodoService;
        this.equipajeService = equipajeService;
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

    @GetMapping("/{iata}/equipajes")
    public ResponseEntity<?> obtenerEquipajes(@PathVariable String iata) {
        return ResponseEntity.ok(equipajeService.obtenerEnviosNodo(iata));
    }

    @GetMapping("/{iata}/envios")
    public ResponseEntity<?> obtenerEnviosNodo(@PathVariable String iata,
                                               @RequestParam(required = false) UUID sesionId) {
        try {
            return ResponseEntity.ok(equipajeService.obtenerEnviosPorNodoConClasificacion(iata, sesionId));
        } catch (EquipajeService.NodoNoEncontradoException e) {
            return ResponseEntity.notFound().build();
        }
    }
}