package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.OperacionTickService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/operacion")
public class OperacionController {

    private final OperacionTickService operacionTickService;

    public OperacionController(OperacionTickService operacionTickService) {
        this.operacionTickService = operacionTickService;
    }

    @PostMapping("/iniciar")
    public ResponseEntity<Map<String, Object>> iniciar(
            @RequestHeader("X-Device-Id") String dispositivoId) {
        operacionTickService.iniciar(dispositivoId);
        return ResponseEntity.ok(Map.of("estado", "ACTIVO"));
    }

    @PostMapping("/pausar")
    public ResponseEntity<Map<String, Object>> pausar(
            @RequestHeader("X-Device-Id") String dispositivoId) {
        if (!operacionTickService.esPropietario(dispositivoId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("status", 403, "error", "ACCESO_DENEGADO",
                            "mensaje", "Solo el dispositivo que inicio la operacion puede pausarla"));
        }
        operacionTickService.pausar();
        return ResponseEntity.ok(Map.of("estado", "PAUSADO"));
    }

    @PostMapping("/reanudar")
    public ResponseEntity<Map<String, Object>> reanudar(
            @RequestHeader("X-Device-Id") String dispositivoId) {
        if (!operacionTickService.esPropietario(dispositivoId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("status", 403, "error", "ACCESO_DENEGADO",
                            "mensaje", "Solo el dispositivo que inicio la operacion puede reanudarla"));
        }
        operacionTickService.reanudar();
        return ResponseEntity.ok(Map.of("estado", "ACTIVO"));
    }

    @PostMapping("/detener")
    public ResponseEntity<Map<String, Object>> detener(
            @RequestHeader("X-Device-Id") String dispositivoId) {
        if (!operacionTickService.esPropietario(dispositivoId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("status", 403, "error", "ACCESO_DENEGADO",
                            "mensaje", "Solo el dispositivo que inicio la operacion puede detenerla"));
        }
        operacionTickService.detener();
        return ResponseEntity.ok(Map.of("estado", "INACTIVO"));
    }

    @GetMapping("/estado")
    public ResponseEntity<Map<String, Object>> estado() {
        return ResponseEntity.ok(Map.of("estado", operacionTickService.getEstado()));
    }
}
