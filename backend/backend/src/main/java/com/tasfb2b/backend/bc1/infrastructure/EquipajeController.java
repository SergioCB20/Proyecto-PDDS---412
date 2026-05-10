package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.EquipajeService;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import com.tasfb2b.backend.bc3.domain.Usuario;
import com.tasfb2b.backend.bc3.infrastructure.UsuarioRepository;
import com.tasfb2b.backend.shared.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/equipajes")
public class EquipajeController {

    private final EquipajeService equipajeService;
    private final JwtUtil jwtUtil;
    private final UsuarioRepository usuarioRepository;

    public EquipajeController(EquipajeService equipajeService, JwtUtil jwtUtil, UsuarioRepository usuarioRepository) {
        this.equipajeService = equipajeService;
        this.jwtUtil = jwtUtil;
        this.usuarioRepository = usuarioRepository;
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
            EquipajeService.EquipajeResponse response = equipajeService.registrar(nodoId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (EquipajeService.ValidacionException e) {
            return ResponseEntity.unprocessableEntity().body(error(422, "VALIDACION_FALLIDA", e.getMessage()));
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