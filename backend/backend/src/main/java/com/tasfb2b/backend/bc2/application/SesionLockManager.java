package com.tasfb2b.backend.bc2.application;

import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Provee un lock por sesión para serializar las operaciones que mutan
 * la misma data (segmentos_plan, planes_viaje, vuelos, nodos).
 *
 * El tick ({@code TickService}) y el planificador ({@code SimulacionPlanificador})
 * corren en hilos distintos del scheduler (pool.size=4) para no bloquearse entre
 * sesiones. Pero dentro de UNA misma sesión no deben mutar la misma data a la vez,
 * de lo contrario el planificador puede borrar un segmento que el tick está
 * marcando EN_CURSO → StaleObjectStateException.
 *
 * Este lock garantiza exclusión mutua por sesión sin serializar sesiones distintas.
 */
@Component
public class SesionLockManager {

    private final ConcurrentHashMap<UUID, ReentrantLock> locks = new ConcurrentHashMap<>();

    public ReentrantLock obtener(UUID sesionId) {
        return locks.computeIfAbsent(sesionId, k -> new ReentrantLock());
    }

    public void eliminar(UUID sesionId) {
        locks.remove(sesionId);
    }
}
