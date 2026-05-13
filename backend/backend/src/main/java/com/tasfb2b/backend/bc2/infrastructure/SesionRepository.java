package com.tasfb2b.backend.bc2.infrastructure;

import com.tasfb2b.backend.bc2.domain.SesionEjecucion;
import com.tasfb2b.backend.bc2.domain.EstadoSesion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SesionRepository extends JpaRepository<SesionEjecucion, UUID> {
    List<SesionEjecucion> findByEstado(EstadoSesion estado);
    List<SesionEjecucion> findByTipo(String tipo);
}