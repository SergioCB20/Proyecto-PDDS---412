package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.CargaSimulacionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final CargaSimulacionService cargaSimulacionService;

    public AdminController(CargaSimulacionService cargaSimulacionService) {
        this.cargaSimulacionService = cargaSimulacionService;
    }

    @PostMapping("/carga-simulacion")
    public ResponseEntity<?> ejecutarCargaSimulacion() {
        try {
            CargaSimulacionService.ResultadoCarga resultado = cargaSimulacionService.cargarTodos();
            return ResponseEntity.ok(Map.of(
                    "total_equipajes", resultado.totalEquipajes(),
                    "total_lineas", resultado.totalLineas(),
                    "errores", resultado.lineasError()
            ));
        } catch (CargaSimulacionService.CargaException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
