package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.NodoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/operacion/nodo")
public class OperacionCapacidadController {

    private final NodoService nodoService;

    public OperacionCapacidadController(NodoService nodoService) {
        this.nodoService = nodoService;
    }

    @PostMapping("/{iata}/capacidad")
    public ResponseEntity<?> setCapacidad(@PathVariable String iata,
                                           @RequestBody NodoService.CapacidadRequest request) {
        return ResponseEntity.ok(nodoService.actualizarCapacidad(iata.toUpperCase(), request.capacidad()));
    }

    @DeleteMapping("/{iata}/capacidad")
    public ResponseEntity<?> restaurarCapacidad(@PathVariable String iata) {
        return ResponseEntity.ok(Map.of(
            "mensaje", "Capacidad restaurada a valor original",
            "nodo", nodoService.restaurarCapacidad(iata.toUpperCase())
        ));
    }
}
