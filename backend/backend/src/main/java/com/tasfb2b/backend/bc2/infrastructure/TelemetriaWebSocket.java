package com.tasfb2b.backend.bc2.infrastructure;

import com.tasfb2b.backend.shared.security.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TelemetriaWebSocket extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(TelemetriaWebSocket.class);
    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();
    private final JwtUtil jwtUtil;

    public TelemetriaWebSocket(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String token = extractToken(session);
        if (token == null || !jwtUtil.esTokenValido(token)) {
            try {
                session.close(CloseStatus.POLICY_VIOLATION);
            } catch (Exception e) {
                log.warn("Error closing unauthorized websocket: {}", e.getMessage());
            }
            return;
        }
        sessions.add(session);
        log.info("WebSocket telemetria client connected: {}", session.getId());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        log.info("WebSocket telemetria client disconnected: {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
    }

    public void broadcast(String json) {
        if (sessions.isEmpty()) return;
        TextMessage msg = new TextMessage(json);
        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(msg);
                } catch (Exception e) {
                    log.warn("Error sending telemetry to client {}: {}", session.getId(), e.getMessage());
                    sessions.remove(session);
                    try { session.close(CloseStatus.SERVER_ERROR); } catch (Exception ignored) {}
                }
            }
        }
    }

    private String extractToken(WebSocketSession session) {
        URI uri = session.getUri();
        if (uri == null) return null;
        String query = uri.getQuery();
        if (query == null) return null;
        for (String param : query.split("&")) {
            String[] parts = param.split("=", 2);
            if (parts.length == 2 && "token".equals(parts[0])) {
                return parts[1];
            }
        }
        return null;
    }
}
