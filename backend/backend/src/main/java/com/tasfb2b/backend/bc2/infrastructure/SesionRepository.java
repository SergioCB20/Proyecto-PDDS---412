package com.tasfb2b.backend.bc2.infrastructure;

import com.tasfb2b.backend.bc2.domain.SesionEjecucion;
import com.tasfb2b.backend.bc2.domain.EstadoSesion;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SesionRepository extends JpaRepository<SesionEjecucion, UUID> {
    List<SesionEjecucion> findByEstado(EstadoSesion estado);
    List<SesionEjecucion> findByTipo(String tipo);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SesionEjecucion s WHERE s.estado = :estado")
    List<SesionEjecucion> findByEstadoWithLock(@Param("estado") EstadoSesion estado);
}