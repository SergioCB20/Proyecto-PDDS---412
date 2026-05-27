package com.tasfb2b.backend.bc2.infrastructure;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final TelemetriaWebSocket telemetriaWebSocket;

    public WebSocketConfig(TelemetriaWebSocket telemetriaWebSocket) {
        this.telemetriaWebSocket = telemetriaWebSocket;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(telemetriaWebSocket, "/api/ws/telemetria")
                .setAllowedOrigins("*");
    }
}
