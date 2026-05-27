package com.tasfb2b.backend.bc2.infrastructure;

import com.tasfb2b.backend.bc2.application.*;
import com.tasfb2b.backend.bc2.application.SesionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/sesiones")
@PreAuthorize("hasRole('ANALISTA')")
public class SesionController {

    private final SesionService sesionService;

    public SesionController(SesionService sesionService) {
        this.sesionService = sesionService;
    }

    @PostMapping
    public ResponseEntity<SesionResponse> crearSesion(@RequestBody CrearSesionRequest request) {
        SesionResponse response = sesionService.crearSesion(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SesionResponse> obtenerSesion(@PathVariable UUID id) {
        var sesion = sesionService.obtenerSesion(id);
        return ResponseEntity.ok(new SesionResponse(sesion.getId(), sesion.getTipo().name(), sesion.getEstado().name()));
    }

    @PostMapping("/{id}/iniciar")
    public ResponseEntity<SesionIniciarResponse> iniciarSesion(@PathVariable UUID id) {
        SesionIniciarResponse response = sesionService.iniciarSesion(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/pausar")
    public ResponseEntity<SesionEstadoResponse> pausarSesion(@PathVariable UUID id) {
        SesionEstadoResponse response = sesionService.pausarSesion(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/detener")
    public ResponseEntity<SesionEstadoResponse> detenerSesion(@PathVariable UUID id) {
        SesionEstadoResponse response = sesionService.detenerSesion(id);
        return ResponseEntity.ok(response);
    }

}