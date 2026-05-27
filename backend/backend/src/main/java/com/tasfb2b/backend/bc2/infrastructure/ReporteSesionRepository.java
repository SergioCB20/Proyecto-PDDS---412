package com.tasfb2b.backend.bc2.infrastructure;

import com.tasfb2b.backend.bc2.domain.ReporteSesion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReporteSesionRepository extends JpaRepository<ReporteSesion, UUID> {
    Optional<ReporteSesion> findBySesionId(UUID sesionId);
}
