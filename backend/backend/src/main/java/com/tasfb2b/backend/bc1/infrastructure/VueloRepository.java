package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface VueloRepository extends JpaRepository<Vuelo, UUID>, JpaSpecificationExecutor<Vuelo> {
    Page<Vuelo> findByEstado(EstadoVuelo estado, Pageable pageable);
    Page<Vuelo> findByEstadoAndHoraSalidaBetween(EstadoVuelo estado, java.time.OffsetDateTime desde, java.time.OffsetDateTime hasta, Pageable pageable);
    Page<Vuelo> findByHoraSalidaBetween(java.time.OffsetDateTime desde, java.time.OffsetDateTime hasta, Pageable pageable);
    Page<Vuelo> findByDestinoCodigoIataAndEstado(String codigoIata, EstadoVuelo estado, Pageable pageable);
}