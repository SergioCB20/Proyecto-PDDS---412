package com.tasfb2b.backend.bc3.infrastructure;

import com.tasfb2b.backend.bc3.application.UsuarioService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public ResponseEntity<Page<UsuarioService.UsuarioResponse>> listar(
            @RequestParam Optional<String> estado,
            Pageable pageable) {
        return ResponseEntity.ok(usuarioService.listar(estado, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> obtener(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(usuarioService.obtener(id));
        } catch (UsuarioService.UsuarioNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(error(404, "NO_ENCONTRADO", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> crear(
            Authentication auth,
            @RequestBody UsuarioService.CrearUsuarioRequest request) {
        try {
            UUID actorId = UUID.fromString(auth.getPrincipal().toString());
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(usuarioService.crear(actorId, request));
        } catch (UsuarioService.CorreoYaExisteException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(error(409, "CORREO_DUPLICADO", e.getMessage()));
        } catch (UsuarioService.RolNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(error(400, "ROL_INVALIDO", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(
            Authentication auth,
            @PathVariable UUID id,
            @RequestBody UsuarioService.ActualizarUsuarioRequest request) {
        try {
            UUID actorId = UUID.fromString(auth.getPrincipal().toString());
            return ResponseEntity.ok(usuarioService.actualizar(actorId, id, request));
        } catch (UsuarioService.UsuarioNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(error(404, "NO_ENCONTRADO", e.getMessage()));
        } catch (UsuarioService.ActualizacionNoPermitidaException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(error(403, "ACTUALIZACION_NO_PERMITIDA", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(
            Authentication auth,
            @PathVariable UUID id,
            @RequestBody UsuarioService.CambiarEstadoRequest request) {
        try {
            UUID actorId = UUID.fromString(auth.getPrincipal().toString());
            return ResponseEntity.ok(usuarioService.cambiarEstado(actorId, id, request));
        } catch (UsuarioService.UsuarioNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(error(404, "NO_ENCONTRADO", e.getMessage()));
        }
    }

    private Map<String, Object> error(int status, String error, String mensaje) {
        return Map.of(
                "status", status,
                "error", error,
                "mensaje", mensaje
        );
    }
}