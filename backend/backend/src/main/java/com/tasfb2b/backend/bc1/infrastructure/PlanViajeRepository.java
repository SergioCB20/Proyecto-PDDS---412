package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.PlanViaje;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlanViajeRepository extends JpaRepository<PlanViaje, UUID> {
    Optional<PlanViaje> findByEquipajeId(UUID equipajeId);
    List<PlanViaje> findBySesionId(UUID sesionId);

    @Modifying
    @Query("DELETE FROM PlanViaje pv WHERE pv.equipaje.id = :equipajeId")
    int deleteByEquipajeId(@Param("equipajeId") UUID equipajeId);

    @Query("SELECT pv FROM PlanViaje pv JOIN FETCH pv.equipaje WHERE pv.sesionId = :sesionId")
    List<PlanViaje> findBySesionIdWithEquipaje(@Param("sesionId") UUID sesionId);

    /** Total de planes con equipaje para la sesión (denominador del SLA). */
    @Query("SELECT COALESCE(SUM(e.cantidad), 0) FROM PlanViaje pv JOIN pv.equipaje e WHERE pv.sesionId = :sesionId AND e IS NOT NULL")
    long sumCantidadBySesionId(@Param("sesionId") UUID sesionId);

    @Query("SELECT COALESCE(SUM(e.cantidad), 0) FROM PlanViaje pv JOIN pv.equipaje e WHERE pv.sesionId = :sesionId "
            + "AND e.estado = com.tasfb2b.backend.bc1.domain.EstadoEquipaje.ENTREGADO")
    long sumCantidadEntregadosBySesionId(@Param("sesionId") UUID sesionId);

    @Query("SELECT e FROM Equipaje e " +
           "JOIN PlanViaje pv ON pv.equipaje = e " +
           "JOIN SegmentoPlan sp ON sp.planViaje = pv " +
           "JOIN sp.vuelo v " +
           "WHERE pv.sesionId = :sesionId " +
           "AND e.estado = 'ENTREGADO' " +
           "AND sp.estado = 'COMPLETADO' " +
           "AND sp.orden = (SELECT MAX(sp2.orden) FROM SegmentoPlan sp2 " +
           "                WHERE sp2.planViaje = pv AND sp2.estado = 'COMPLETADO') " +
           "AND v.horaLlegada BETWEEN :desde AND :hasta")
    List<Equipaje> findEntregadosRecientes(
            @Param("sesionId") UUID sesionId,
            @Param("desde") OffsetDateTime desde,
            @Param("hasta") OffsetDateTime hasta);
}