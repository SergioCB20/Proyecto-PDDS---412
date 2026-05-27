package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.CargaMasivaService;
import com.tasfb2b.backend.bc1.application.EquipajeService;
import com.tasfb2b.backend.shared.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/equipajes")
public class EquipajeController {

    private final EquipajeService equipajeService;
    private final CargaMasivaService cargaMasivaService;
    private final JwtUtil jwtUtil;

    public EquipajeController(EquipajeService equipajeService, CargaMasivaService cargaMasivaService,
                              JwtUtil jwtUtil) {
        this.equipajeService = equipajeService;
        this.cargaMasivaService = cargaMasivaService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping
    public ResponseEntity<?> registrar(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody EquipajeService.RegistrarEquipajeRequest request) {
        try {
            UUID nodoId = extraerNodoIdDelToken(authHeader);
            if (nodoId == null) {
                nodoId = UUID.fromString("00000000-0000-0000-0003-000000000001");
            }
            var response = equipajeService.registrar(nodoId, request);
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
        } catch (EquipajeService.ValidacionException e) {
            return ResponseEntity.unprocessableEntity().body(error(422, "VALIDACION_FALLIDA", e.getMessage()));
        }
    }

    @PostMapping("/carga-masiva")
    public ResponseEntity<?> cargaMasiva(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam("archivo") MultipartFile archivo) {
        try {
            UUID nodoId = extraerNodoIdDelToken(authHeader);
            if (nodoId == null) {
                nodoId = UUID.fromString("00000000-0000-0000-0003-000000000001");
            }
            CargaMasivaService.PreviewResponse response = cargaMasivaService.procesarCsv(archivo, nodoId);
            return ResponseEntity.ok(response);
        } catch (CargaMasivaService.CargaException e) {
            return ResponseEntity.badRequest().body(error(400, "CARGA_INVALIDA", e.getMessage()));
        }
    }

    @PostMapping("/carga-masiva/confirmar")
    public ResponseEntity<?> confirmarCargaMasiva(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CargaMasivaService.ConfirmarRequest request) {
        try {
            UUID nodoId = extraerNodoIdDelToken(authHeader);
            if (nodoId == null) {
                nodoId = UUID.fromString("00000000-0000-0000-0003-000000000001");
            }
            CargaMasivaService.ConfirmarResponse response = cargaMasivaService.confirmar(request, nodoId);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (CargaMasivaService.CargaException e) {
            return ResponseEntity.badRequest().body(error(400, "CONFIRMAR_INVALIDO", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable UUID id, @RequestBody EquipajeService.RegistrarEquipajeRequest request) {
        try {
            return ResponseEntity.ok(equipajeService.actualizar(id, request));
        } catch (EquipajeService.EquipajeNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(404, "NO_ENCONTRADO", e.getMessage()));
        } catch (EquipajeService.ValidacionException e) {
            return ResponseEntity.unprocessableEntity().body(error(422, "VALIDACION_FALLIDA", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable UUID id) {
        try {
            equipajeService.eliminar(id);
            return ResponseEntity.noContent().build();
        } catch (EquipajeService.EquipajeNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(404, "NO_ENCONTRADO", e.getMessage()));
        }
    }

    @GetMapping("/{id}/plan-viaje")
    public ResponseEntity<?> obtenerPlanViaje(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(equipajeService.obtenerDetallePlanViaje(id));
        } catch (EquipajeService.EquipajeNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(error(404, "NO_ENCONTRADO", e.getMessage()));
        } catch (EquipajeService.ValidacionException e) {
            return ResponseEntity.unprocessableEntity().body(error(422, "VALIDACION_FALLIDA", e.getMessage()));
        }
    }

    private UUID extraerNodoIdDelToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        String token = authHeader.substring(7);
        if (!jwtUtil.esTokenValido(token)) return null;
        return jwtUtil.extraerNodoRefId(token);
    }

    private Map<String, Object> error(int status, String error, String mensaje) {
        return Map.of("status", status, "error", error, "mensaje", mensaje);
    }
}