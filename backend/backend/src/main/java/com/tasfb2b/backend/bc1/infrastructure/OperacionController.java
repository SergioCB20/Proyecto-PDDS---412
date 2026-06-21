package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.OperacionTickService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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

    @PostMapping("/toggle")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> toggle() {
        boolean activo = operacionTickService.toggle();
        return ResponseEntity.ok(Map.of("activo", activo));
    }

    @GetMapping("/estado")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> estado() {
        boolean activo = operacionTickService.estaActivo();
        return ResponseEntity.ok(Map.of("activo", activo));
    }
}
