package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.EstadoEquipaje;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
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

    @Query("SELECT e FROM Equipaje e JOIN PlanViaje pv ON pv.equipaje = e " +
           "WHERE pv.sesionId = :sesionId AND e.vueloActual.id = :vueloId")
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
}