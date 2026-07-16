package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.EstadoEquipaje;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EquipajeRepository extends JpaRepository<Equipaje, UUID> {
    Optional<Equipaje> findByIdExterno(String idExterno);
    Page<Equipaje> findByEstado(EstadoEquipaje estado, Pageable pageable);
    List<Equipaje> findByVueloActualId(UUID vueloActualId);
    List<Equipaje> findByVueloActualIdIn(List<UUID> vueloActualIds);
    long countByVueloActualId(UUID vueloId);

    @Query("SELECT DISTINCT e FROM Equipaje e " +
           "JOIN PlanViaje pv ON pv.equipaje = e " +
           "LEFT JOIN SegmentoPlan sp ON sp.planViaje = pv " +
           "WHERE pv.sesionId = :sesionId " +
           "  AND (e.vueloActual.id = :vueloId OR sp.vuelo.id = :vueloId)")
    List<Equipaje> findBySesionIdAndVueloActualId(
            @Param("sesionId") UUID sesionId,
            @Param("vueloId") UUID vueloId);

    long countByEstado(EstadoEquipaje estado);

    @Query(value = "SELECT estado::text, COUNT(*)::bigint FROM equipajes GROUP BY estado", nativeQuery = true)
    List<Object[]> countByEstadoGrouped();

    @Query(value = "SELECT COUNT(*) FROM equipajes WHERE fecha_ingreso >= :desde", nativeQuery = true)
    long countDesde(@Param("desde") java.time.OffsetDateTime desde);

    @Query(value = "SELECT estado::text, COUNT(*)::bigint FROM equipajes WHERE fecha_ingreso >= :desde GROUP BY estado", nativeQuery = true)
    List<Object[]> countByEstadoGroupedDesde(@Param("desde") java.time.OffsetDateTime desde);

    @Query("SELECT e FROM Equipaje e WHERE e.estado = 'ENTREGADO' AND e.fechaOperacion >= :desde ORDER BY e.fechaOperacion DESC")
    List<Equipaje> findEntregadosRecientes(@Param("desde") java.time.OffsetDateTime desde, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT e FROM Equipaje e WHERE e.estado = :estado AND e.vueloActual.id = :vueloId")
    List<Equipaje> findByEstadoAndVueloActualId(@Param("estado") EstadoEquipaje estado, @Param("vueloId") UUID vueloId);

    @Query("SELECT e FROM Equipaje e WHERE e.estado = :estado AND e.origenIata = :nodoIata")
    List<Equipaje> findByEstadoAndOrigenIata(@Param("estado") EstadoEquipaje estado, @Param("nodoIata") String nodoIata);

    @Query("SELECT e FROM Equipaje e WHERE e.estado = :estado AND e.destinoIata = :nodoIata")
    List<Equipaje> findByEstadoAndDestinoIata(@Param("estado") EstadoEquipaje estado, @Param("nodoIata") String nodoIata);

    /**
     * Bolsas EN_ALMACEN en un nodo: busca por origen (primer nodo) o por destino del
     * último segmento COMPLETADO (nodo intermedio). Cubre ambos casos sin depender de
     * vueloActual que es null cuando el equipaje está almacenado.
     */
    @Query("SELECT DISTINCT e FROM Equipaje e " +
           "JOIN PlanViaje pv ON pv.equipaje = e " +
           "WHERE pv.sesionId = :sesionId AND e.estado = :estado " +
           "AND (" +
           "  e.origenIata = :nodoIata " +
           "  OR EXISTS (" +
           "    SELECT sp FROM SegmentoPlan sp " +
           "    WHERE sp.planViaje = pv AND sp.estado = 'COMPLETADO' " +
           "    AND sp.nodoDestino.codigoIata = :nodoIata " +
           "    AND sp.orden = (SELECT MAX(sp2.orden) FROM SegmentoPlan sp2 " +
           "                   WHERE sp2.planViaje = pv AND sp2.estado = 'COMPLETADO')" +
           "  )" +
           ")")
    List<Equipaje> findBySesionIdAndEstadoAndNodoIata(
            @Param("sesionId") UUID sesionId,
            @Param("estado") EstadoEquipaje estado,
            @Param("nodoIata") String nodoIata);

    /**
     * ¿Existe alguna maleta que ya entró al sistema (fecha_operacion &lt; limite) y cuyo deadline
     * de SLA ya pasó (sla_comprometido &lt; limite) sin haber sido entregada? Señal del primer
     * incumplimiento de SLA para el colapso de la simulación. Eficiente con índice en
     * sla_comprometido. El filtro por fecha_operacion descarta las maletas de la operación día
     * a día (fechadas más adelante) que comparten físicamente la tabla equipajes.
     */
    @Query(value = "SELECT EXISTS(SELECT 1 FROM equipajes " +
            "WHERE estado <> 'ENTREGADO' AND sla_comprometido < :limite AND fecha_operacion < :limite)",
            nativeQuery = true)
    boolean existsIncumplimientoSla(@Param("limite") java.time.OffsetDateTime limite);

    @Query("SELECT DISTINCT e FROM Equipaje e LEFT JOIN e.maletas m WHERE e.estado IN :estados " +
           "AND (:origenIata IS NULL OR e.origenIata = :origenIata) " +
           "AND (:destinoIata IS NULL OR e.destinoIata = :destinoIata) " +
           "AND (:codigoMaleta IS NULL OR m.codigoMaleta LIKE :codigoMaleta) " +
           "ORDER BY e.fechaIngreso DESC")
    List<Equipaje> findEnviosPanel(@Param("estados") List<EstadoEquipaje> estados,
                                   @Param("origenIata") String origenIata,
                                   @Param("destinoIata") String destinoIata,
                                   @Param("codigoMaleta") String codigoMaleta,
                                   Pageable pageable);

    @Query("SELECT COUNT(e) FROM Equipaje e WHERE e.fechaIngreso BETWEEN :desde AND :hasta")
    long countByFechaIngresoBetween(@Param("desde") OffsetDateTime desde, @Param("hasta") OffsetDateTime hasta);

    @Query("SELECT COUNT(e) FROM Equipaje e WHERE e.estado = :estado AND e.fechaIngreso BETWEEN :desde AND :hasta")
    long countByEstadoAndFechaIngresoBetween(@Param("estado") EstadoEquipaje estado,
                                             @Param("desde") OffsetDateTime desde,
                                             @Param("hasta") OffsetDateTime hasta);

    @Query("SELECT COUNT(e) FROM Equipaje e WHERE e.estado = :estado AND e.fechaIngreso < :hasta")
    long countByEstadoAndFechaIngresoBefore(@Param("estado") EstadoEquipaje estado,
                                            @Param("hasta") OffsetDateTime hasta);

    @Query("SELECT DISTINCT e FROM Equipaje e " +
           "JOIN PlanViaje pv ON pv.equipaje = e " +
           "JOIN SegmentoPlan sp ON sp.planViaje = pv " +
           "WHERE e.estado = 'ENRUTADO' AND sp.orden = 1 AND sp.estado = 'PENDIENTE' " +
           "AND sp.nodoOrigen.codigoIata = :nodoIata " +
           "ORDER BY e.fechaIngreso DESC")
    List<Equipaje> findEnRutadoSaliendo(@Param("nodoIata") String nodoIata, Pageable pageable);

    @Query("SELECT e FROM Equipaje e " +
           "WHERE e.estado = 'EN_VUELO' AND e.vueloActual.destino.codigoIata = :nodoIata " +
           "ORDER BY e.fechaIngreso DESC")
    List<Equipaje> findEnVueloLlegando(@Param("nodoIata") String nodoIata, Pageable pageable);

    @Query("SELECT DISTINCT e FROM Equipaje e " +
           "JOIN PlanViaje pv ON pv.equipaje = e " +
           "JOIN SegmentoPlan sp ON sp.planViaje = pv " +
           "WHERE e.estado = 'EN_ALMACEN' AND sp.estado = 'COMPLETADO' " +
           "AND sp.nodoDestino.codigoIata = :nodoIata " +
           "AND sp.orden = (SELECT MAX(sp2.orden) FROM SegmentoPlan sp2 " +
           "               WHERE sp2.planViaje = pv AND sp2.estado = 'COMPLETADO') " +
           "ORDER BY e.fechaIngreso DESC")
    List<Equipaje> findEnAlmacenEnNodo(@Param("nodoIata") String nodoIata, Pageable pageable);
}