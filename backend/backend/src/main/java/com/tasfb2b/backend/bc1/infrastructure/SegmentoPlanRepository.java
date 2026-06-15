package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.EstadoSegmento;
import com.tasfb2b.backend.bc1.domain.SegmentoPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface SegmentoPlanRepository extends JpaRepository<SegmentoPlan, UUID> {
    List<SegmentoPlan> findByPlanViajeIdOrderByOrdenAsc(UUID planViajeId);
    List<SegmentoPlan> findByPlanViajeIdInOrderByOrdenAsc(List<UUID> planViajeIds);
    List<SegmentoPlan> findByVueloId(UUID vueloId);
    List<SegmentoPlan> findByVueloIdIn(List<UUID> vueloIds);
    List<SegmentoPlan> findByVueloIdAndEstado(UUID vueloId, EstadoSegmento estado);

    /** Equipajes ENRUTADOS cuyo segmento con el vuelo dado no ha salido aún (vueloActual = null). */
    @Query("SELECT DISTINCT sp.planViaje.equipaje FROM SegmentoPlan sp " +
           "WHERE sp.vuelo.id = :vueloId AND sp.estado = :estado")
    List<Equipaje> findEquipajesByVueloIdAndEstado(@Param("vueloId") UUID vueloId,
                                                    @Param("estado") EstadoSegmento estado);
}