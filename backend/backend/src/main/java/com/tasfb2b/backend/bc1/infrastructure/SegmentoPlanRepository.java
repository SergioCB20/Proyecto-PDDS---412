package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.SegmentoPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface SegmentoPlanRepository extends JpaRepository<SegmentoPlan, UUID> {
    List<SegmentoPlan> findByPlanViajeIdOrderByOrdenAsc(UUID planViajeId);
}