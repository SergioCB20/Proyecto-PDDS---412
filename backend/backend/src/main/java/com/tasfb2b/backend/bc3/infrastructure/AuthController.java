package com.tasfb2b.backend.bc3.infrastructure;

import com.tasfb2b.backend.bc3.application.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthService.LoginRequest request) {
        try {
            AuthService.LoginResponse response = authService.autenticar(request.correo(), request.password());
            return ResponseEntity.ok(response);
        } catch (AuthService.CredencialesInvalidasException e) {
            return ResponseEntity.status(401).body(Map.of(
                    "timestamp", OffsetDateTime.now().toString(),
                    "status", 401,
                    "error", "CREDENCIALES_INVALIDAS",
                    "mensaje", e.getMessage()
            ));
        } catch (AuthService.UsuarioInactivoException e) {
            return ResponseEntity.status(403).body(Map.of(
                    "timestamp", OffsetDateTime.now().toString(),
                    "status", 403,
                    "error", "USUARIO_INACTIVO",
                    "mensaje", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Error inesperado en login para {}: {}", request.correo(), e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "timestamp", OffsetDateTime.now().toString(),
                    "status", 500,
                    "error", "ERROR_INTERNO",
                    "mensaje", "Error interno del servidor"
            ));
        }
    }
}