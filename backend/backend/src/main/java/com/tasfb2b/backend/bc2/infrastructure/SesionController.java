package com.tasfb2b.backend.bc2.infrastructure;

import com.tasfb2b.backend.bc2.application.*;
import com.tasfb2b.backend.bc2.application.SesionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.Map;

@RestController
@RequestMapping("/api/sesiones")
public class SesionController {

    private final SesionService sesionService;

    public SesionController(SesionService sesionService) {
        this.sesionService = sesionService;
    }

    @GetMapping
    public ResponseEntity<List<SesionListaResponse>> listarSesiones(
            @RequestParam(required = false) String estado) {
        return ResponseEntity.ok(sesionService.listarSesiones(estado));
    }

    @PostMapping
    public ResponseEntity<SesionResponse> crearSesion(
            @RequestBody CrearSesionRequest request,
            @RequestHeader("X-Device-Id") String dispositivoId) {
        SesionResponse response = sesionService.crearSesion(request, dispositivoId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SesionResponse> obtenerSesion(@PathVariable UUID id) {
        var sesion = sesionService.obtenerSesion(id);
        return ResponseEntity.ok(new SesionResponse(sesion.getId(), sesion.getTipo().name(), sesion.getEstado().name()));
    }

    @PostMapping("/{id}/iniciar")
    public ResponseEntity<SesionIniciarResponse> iniciarSesion(
            @PathVariable UUID id,
            @RequestHeader("X-Device-Id") String dispositivoId) {
        SesionIniciarResponse response = sesionService.iniciarSesion(id, dispositivoId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/pausar")
    public ResponseEntity<SesionEstadoResponse> pausarSesion(
            @PathVariable UUID id,
            @RequestHeader("X-Device-Id") String dispositivoId) {
        SesionEstadoResponse response = sesionService.pausarSesion(id, dispositivoId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/detener")
    public ResponseEntity<SesionEstadoResponse> detenerSesion(
            @PathVariable UUID id,
            @RequestHeader("X-Device-Id") String dispositivoId) {
        SesionEstadoResponse response = sesionService.detenerSesion(id, dispositivoId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/envios/vuelo/{vueloId}")
    public ResponseEntity<?> obtenerEnviosVuelo(
            @PathVariable UUID id,
            @PathVariable UUID vueloId) {
        try {
            return ResponseEntity.ok(sesionService.obtenerEnviosVuelo(id, vueloId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("status", 404, "error", "NO_ENCONTRADO", "mensaje", e.getMessage()));
        }
    }

    @GetMapping("/{id}/envios/nodo/{nodoIata}")
    public ResponseEntity<?> obtenerEnviosNodo(
            @PathVariable UUID id,
            @PathVariable String nodoIata) {
        try {
            return ResponseEntity.ok(sesionService.obtenerEnviosNodo(id, nodoIata));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("status", 404, "error", "NO_ENCONTRADO", "mensaje", e.getMessage()));
        }
    }

    @GetMapping("/{id}/envios/envios-panel")
    public ResponseEntity<?> obtenerEnviosPanel(
            @PathVariable UUID id,
            @RequestParam String tipo,
            @RequestParam(required = false) String origen_iata,
            @RequestParam(required = false) String destino_iata) {
        try {
            return ResponseEntity.ok(sesionService.obtenerEnviosPanelSesion(id, tipo, origen_iata, destino_iata));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("status", 400, "error", "PARAMETRO_INVALIDO", "mensaje", e.getMessage()));
        }
    }

    @GetMapping("/{id}/envios/entregados-recientes")
    public ResponseEntity<?> obtenerEntregadosRecientes(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "4") int horas) {
        try {
            return ResponseEntity.ok(sesionService.obtenerEntregadosRecientes(id, horas));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("status", 404, "error", "NO_ENCONTRADO", "mensaje", e.getMessage()));
        }
    }

}