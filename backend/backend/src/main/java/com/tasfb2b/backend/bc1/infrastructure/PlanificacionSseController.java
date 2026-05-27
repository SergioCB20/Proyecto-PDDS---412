package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.shared.infrastructure.SseService;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("/api/eventos")
public class PlanificacionSseController {

    private final SseService sseService;

    public PlanificacionSseController(SseService sseService) {
        this.sseService = sseService;
    }

    @GetMapping(value = "/planificacion", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasRole('OPERADOR_LOGISTICO')")
    public SseEmitter suscribirPlanificacion() {
        UUID sessionId = UUID.randomUUID();
        return sseService.registrar(sessionId);
    }
}
