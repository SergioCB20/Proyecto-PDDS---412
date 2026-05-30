package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.ColaPlanificacion;
import com.tasfb2b.backend.bc1.domain.EstadoCola;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ColaPlanificacionRepository extends JpaRepository<ColaPlanificacion, UUID> {

    @Query(value = "SELECT * FROM cola_planificacion WHERE estado = :estado ORDER BY fecha_creacion ASC LIMIT 1 FOR UPDATE SKIP LOCKED",
           nativeQuery = true)
    Optional<ColaPlanificacion> findTopByEstadoWithLock(@Param("estado") String estado);

    @Query(value = "SELECT * FROM cola_planificacion WHERE estado = :estado ORDER BY sla_comprometido ASC NULLS LAST, fecha_creacion ASC LIMIT :limit FOR UPDATE SKIP LOCKED",
           nativeQuery = true)
    List<ColaPlanificacion> findBatchByEstadoWithLock(@Param("estado") String estado, @Param("limit") int limit);

    List<ColaPlanificacion> findByEstadoAndFechaCreacionBefore(EstadoCola estado, OffsetDateTime before);
}
