package com.tasfb2b.backend.bc3.infrastructure;

import com.tasfb2b.backend.bc3.application.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

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
                    "timestamp", java.time.OffsetDateTime.now().toString(),
                    "status", 401,
                    "error", "CREDENCIALES_INVALIDAS",
                    "mensaje", e.getMessage()
            ));
        } catch (AuthService.UsuarioInactivoException e) {
            return ResponseEntity.status(403).body(Map.of(
                    "timestamp", java.time.OffsetDateTime.now().toString(),
                    "status", 403,
                    "error", "USUARIO_INACTIVO",
                    "mensaje", e.getMessage()
            ));
        }
    }
}