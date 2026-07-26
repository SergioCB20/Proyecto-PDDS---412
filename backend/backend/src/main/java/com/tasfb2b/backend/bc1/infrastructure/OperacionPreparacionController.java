package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.OperacionPreparacionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/operacion/preparacion")
public class OperacionPreparacionController {

    private final OperacionPreparacionService service;

    public OperacionPreparacionController(OperacionPreparacionService service) {
        this.service = service;
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> preparar(
            @RequestParam("archivo") MultipartFile archivo,
            @RequestParam(value = "hora_presentacion", required = false) Integer horaPresentacion) {
        try {
            return ResponseEntity.ok(service.prepararYExpandir(archivo, horaPresentacion));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping(value = "/planes", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> cargarPlanes(
            @RequestParam("archivo") MultipartFile archivo,
            @RequestParam(value = "hora_presentacion", required = false) Integer horaPresentacion) {
        try {
            return ResponseEntity.ok(service.cargarPlanes(archivo, horaPresentacion));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/restaurar")
    public ResponseEntity<Map<String, Object>> restaurar() {
        return ResponseEntity.ok(service.restaurar());
    }

    @PostMapping("/eliminar")
    public ResponseEntity<Map<String, Object>> eliminarCargado() {
        try {
            return ResponseEntity.ok(service.eliminarCargado());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/estado")
    public ResponseEntity<Map<String, Object>> estado() {
        return ResponseEntity.ok(service.estado());
    }

    @GetMapping("/planes")
    public ResponseEntity<List<Map<String, Object>>> listarPlanes(
            @RequestParam(value = "involucra", required = false) String involucra) {
        return ResponseEntity.ok(service.listarPlanes(involucra));
    }
}