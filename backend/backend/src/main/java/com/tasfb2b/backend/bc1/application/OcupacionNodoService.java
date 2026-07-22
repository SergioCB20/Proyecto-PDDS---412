package com.tasfb2b.backend.bc1.application;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
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

    private static final Logger log = LoggerFactory.getLogger(OcupacionNodoService.class);

    /** Contexto sentinela para la operación día a día (las simulaciones usan su propio sesion_id). */
    public static final UUID OPERACION = new UUID(0L, 0L);

    private final JdbcTemplate jdbc;

    public OcupacionNodoService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Ajusta (incrementa/decrementa) la ocupación de un nodo en un contexto específico.
     *
     * <p>Clamps:
     * <ul>
     *   <li>Inferior: nunca negativa (ajustes que llevarían a &lt; 0 se hacen 0).</li>
     *   <li>Superior: nunca supera {@code nodos_logisticos.capacidad_almacen} del nodo
     *       (subselect en ON CONFLICT). Si el delta llevaría a sobrepasar la capacidad,
     *       se registra WARN para diagnóstico sin abortar la operación.</li>
     * </ul>
     *
     * <p>Idempotente: el UPSERT sobre (nodo_id, sesion_id) asegura que llamadas repetidas
     * con los mismos parámetros convergen al mismo valor.
     */
    public void ajustar(UUID nodoId, UUID contexto, int delta) {
        if (delta == 0 || nodoId == null || contexto == null) return;

        Integer nuevaOcupacion = jdbc.query(
            "WITH ins AS (" +
            "  INSERT INTO ocupacion_nodo (id, nodo_id, sesion_id, ocupacion) " +
            "  VALUES (gen_random_uuid(), ?, ?, GREATEST(0, CAST(? AS INT))) " +
            "  ON CONFLICT (nodo_id, sesion_id) DO UPDATE " +
            "  SET ocupacion = GREATEST(0, ocupacion_nodo.ocupacion + CAST(? AS INT)) " +
            "  RETURNING ocupacion" +
            ") SELECT ocupacion FROM ins",
            rs -> rs.next() ? rs.getInt(1) : null,
            nodoId, contexto, delta, delta);

        Integer capMax = jdbc.query(
            "SELECT capacidad_almacen FROM nodos_logisticos WHERE id = ?",
            rs -> rs.next() ? rs.getInt(1) : null,
            nodoId);

        if (nuevaOcupacion != null && capMax != null && nuevaOcupacion > capMax) {
            log.warn("Ocupacion nodo {} (ctx {}) sobrepasada: {} > cap {} (delta aplicado {})",
                    nodoId, contexto, nuevaOcupacion, capMax, delta);
        }
    }

    /**
     * Aplica un lote de ajustes (nodoId -> delta) para un mismo contexto en una sola
     * operación JDBC batch. Reduce round-trips de N a 1 frente al equivalente en bucle
     * llamando a {@link #ajustar}. Mantiene los mismos clamps inferior y superior.
     */
    public void ajustarLote(Map<UUID, Integer> deltas, UUID contexto) {
        if (deltas == null || deltas.isEmpty() || contexto == null) return;

        List<UUID> ids = new ArrayList<>(deltas.keySet());
        List<Integer> ds = new ArrayList<>(ids.size());
        for (UUID id : ids) ds.add(deltas.get(id));

        jdbc.batchUpdate(
            "INSERT INTO ocupacion_nodo (id, nodo_id, sesion_id, ocupacion) " +
            "VALUES (gen_random_uuid(), ?, ?, GREATEST(0, CAST(? AS INT))) " +
            "ON CONFLICT (nodo_id, sesion_id) DO UPDATE " +
            "SET ocupacion = GREATEST(0, ocupacion_nodo.ocupacion + CAST(? AS INT))",
            new BatchPreparedStatementSetter() {
                @Override
                public void setValues(PreparedStatement ps, int i) throws SQLException {
                    ps.setObject(1, ids.get(i));
                    ps.setObject(2, contexto);
                    ps.setInt(3, ds.get(i));
                    ps.setInt(4, ds.get(i));
                }
                @Override
                public int getBatchSize() {
                    return ids.size();
                }
            });
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
