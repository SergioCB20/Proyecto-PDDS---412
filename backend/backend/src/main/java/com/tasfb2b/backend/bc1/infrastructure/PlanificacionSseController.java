package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.shared.infrastructure.SseService;
import com.tasfb2b.backend.shared.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("/api/eventos")
public class PlanificacionSseController {

    private final SseService sseService;
    private final JwtUtil jwtUtil;

    public PlanificacionSseController(SseService sseService, JwtUtil jwtUtil) {
        this.sseService = sseService;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping(value = "/planificacion", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter suscribirPlanificacion(@RequestParam(required = false) String token) {
        String jwt = token;
        if (jwt == null || jwt.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token requerido");
        }
        if (!jwtUtil.esTokenValido(jwt)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalido");
        }
        String rol = jwtUtil.extraerRol(jwt);
        if (!"OPERADOR_LOGISTICO".equals(rol)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Se requiere rol OPERADOR_LOGISTICO");
        }
        UUID sessionId = UUID.randomUUID();
        return sseService.registrar(sessionId);
    }
}
