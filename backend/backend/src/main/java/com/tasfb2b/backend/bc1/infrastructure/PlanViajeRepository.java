package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.PlanViaje;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlanViajeRepository extends JpaRepository<PlanViaje, UUID> {
    Optional<PlanViaje> findByEquipajeId(UUID equipajeId);
    List<PlanViaje> findBySesionId(UUID sesionId);
}