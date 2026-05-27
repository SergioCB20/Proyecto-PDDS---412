package com.tasfb2b.backend.shared.infrastructure;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SseService {

    private static final Logger log = LoggerFactory.getLogger(SseService.class);
    private final ConcurrentHashMap<UUID, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter registrar(UUID sessionId) {
        SseEmitter emitter = new SseEmitter(0L);

        emitter.onCompletion(() -> {
            emitters.remove(sessionId);
            log.info("SSE emitter completed and removed for session {}", sessionId);
        });

        emitter.onTimeout(() -> {
            emitter.complete();
            emitters.remove(sessionId);
            log.info("SSE emitter timed out and removed for session {}", sessionId);
        });

        emitter.onError(e -> {
            emitter.completeWithError(e);
            emitters.remove(sessionId);
            log.warn("SSE emitter error for session {}: {}", sessionId, e.getMessage());
        });

        emitters.put(sessionId, emitter);
        log.info("SSE emitter registered for session {}", sessionId);
        return emitter;
    }

    public void emitir(UUID sessionId, String evento, Object data) {
        SseEmitter emitter = emitters.get(sessionId);
        if (emitter == null) {
            log.warn("Sin emisores SSE para notificar evento {} en session {}", evento, sessionId);
            return;
        }
        try {
            emitter.send(SseEmitter.event()
                    .name(evento)
                    .data(data));
            log.debug("SSE event {} emitted for session {}", evento, sessionId);
        } catch (IOException e) {
            log.warn("Error al emitir SSE event {} para session {}: {}", evento, sessionId, e.getMessage());
            emitters.remove(sessionId);
        }
    }

    public void broadcast(String evento, Object data) {
        if (emitters.isEmpty()) {
            log.warn("Sin emisores SSE para broadcast del evento {}", evento);
            return;
        }
        emitters.forEach((sessionId, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                        .name(evento)
                        .data(data));
            } catch (IOException e) {
                log.warn("Error al emitir SSE broadcast event {} para session {}: {}", evento, sessionId, e.getMessage());
                emitters.remove(sessionId);
            }
        });
    }

    public void eliminar(UUID sessionId) {
        SseEmitter emitter = emitters.remove(sessionId);
        if (emitter != null) {
            emitter.complete();
            log.info("SSE emitter removed for session {}", sessionId);
        }
    }
}
