package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.PlanVuelos;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlanVuelosRepository extends JpaRepository<PlanVuelos, UUID> {
    Optional<PlanVuelos> findFirstByOrderByVigenciaDesdeAsc();
}