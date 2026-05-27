package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.ColaPlanificacion;
import com.tasfb2b.backend.bc1.domain.EstadoCola;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ColaPlanificacionRepository extends JpaRepository<ColaPlanificacion, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(value = "SELECT * FROM cola_planificacion WHERE estado = :estado ORDER BY fecha_creacion ASC LIMIT 1 FOR UPDATE SKIP LOCKED",
           nativeQuery = true)
    Optional<ColaPlanificacion> findTopByEstadoWithLock(@Param("estado") String estado);

    List<ColaPlanificacion> findByEstadoAndFechaCreacionBefore(EstadoCola estado, OffsetDateTime before);
}
