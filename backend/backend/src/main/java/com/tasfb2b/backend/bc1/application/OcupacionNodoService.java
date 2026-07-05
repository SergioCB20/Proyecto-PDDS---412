package com.tasfb2b.backend.bc1.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Gestiona la ocupación de almacén de los nodos SEPARADA POR CONTEXTO, de modo que la operación
 * día a día y cada sesión de simulación no compartan el mismo contador (antes todo iba a la única
 * columna nodos_logisticos.ocupacion_actual).
 *
 * El "contexto" es un UUID: {@link #OPERACION} para la operación día a día, o el id de la sesión
 * para una simulación. Los ajustes son atómicos (upsert con clamp ≥ 0) para tolerar los varios
 * schedulers concurrentes (tick, planificador, worker).
 */
@Service
public class OcupacionNodoService {

    /** Contexto sentinela para la operación día a día (las simulaciones usan su propio sesion_id). */
    public static final UUID OPERACION = new UUID(0L, 0L);

    private final JdbcTemplate jdbc;

    public OcupacionNodoService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Ajusta (incrementa/decrementa, con clamp a ≥ 0) la ocupación de un nodo en un contexto. */
    public void ajustar(UUID nodoId, UUID contexto, int delta) {
        if (delta == 0 || nodoId == null || contexto == null) return;
        jdbc.update(
            "INSERT INTO ocupacion_nodo (id, nodo_id, sesion_id, ocupacion) " +
            "VALUES (gen_random_uuid(), ?, ?, GREATEST(0, ?)) " +
            "ON CONFLICT (nodo_id, sesion_id) DO UPDATE " +
            "SET ocupacion = GREATEST(0, ocupacion_nodo.ocupacion + ?)",
            nodoId, contexto, delta, delta);
    }

    /** Aplica un lote de ajustes (nodoId -> delta) para un mismo contexto. */
    public void ajustarLote(Map<UUID, Integer> deltas, UUID contexto) {
        if (deltas == null) return;
        for (Map.Entry<UUID, Integer> e : deltas.entrySet()) {
            ajustar(e.getKey(), contexto, e.getValue());
        }
    }

    /** Ocupación actual de un nodo en un contexto (0 si no hay fila). */
    public int leer(UUID nodoId, UUID contexto) {
        Integer v = jdbc.query(
            "SELECT ocupacion FROM ocupacion_nodo WHERE nodo_id = ? AND sesion_id = ?",
            rs -> rs.next() ? rs.getInt(1) : 0, nodoId, contexto);
        return v != null ? v : 0;
    }

    /** Mapa nodoId -> ocupación para un contexto (para construir la telemetría en una consulta). */
    public Map<UUID, Integer> mapa(UUID contexto) {
        Map<UUID, Integer> m = new HashMap<>();
        jdbc.query("SELECT nodo_id, ocupacion FROM ocupacion_nodo WHERE sesion_id = ?",
            (java.sql.ResultSet rs) -> { m.put(rs.getObject(1, UUID.class), rs.getInt(2)); }, contexto);
        return m;
    }

    /** Limpia toda la ocupación de un contexto (equivale a poner todos los nodos a 0). */
    public void reset(UUID contexto) {
        if (contexto == null) return;
        jdbc.update("DELETE FROM ocupacion_nodo WHERE sesion_id = ?", contexto);
    }
}
