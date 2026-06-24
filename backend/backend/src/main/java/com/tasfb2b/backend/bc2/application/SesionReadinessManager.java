package com.tasfb2b.backend.bc2.application;

import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SesionReadinessManager {

    private final Set<UUID> readySessions = ConcurrentHashMap.newKeySet();

    public void marcarLista(UUID sesionId) {
        readySessions.add(sesionId);
    }

    public boolean estaLista(UUID sesionId) {
        return readySessions.contains(sesionId);
    }

    public void eliminar(UUID sesionId) {
        readySessions.remove(sesionId);
    }
}
