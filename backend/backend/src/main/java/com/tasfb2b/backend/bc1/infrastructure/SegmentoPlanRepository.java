package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.SegmentoPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface SegmentoPlanRepository extends JpaRepository<SegmentoPlan, UUID> {
    List<SegmentoPlan> findByPlanViajeIdOrderByOrdenAsc(UUID planViajeId);
    List<SegmentoPlan> findByPlanViajeIdInOrderByOrdenAsc(List<UUID> planViajeIds);
    List<SegmentoPlan> findByVueloId(UUID vueloId);
    List<SegmentoPlan> findByVueloIdIn(List<UUID> vueloIds);
    List<SegmentoPlan> findByVueloIdAndEstado(UUID vueloId, com.tasfb2b.backend.bc1.domain.EstadoSegmento estado);
}