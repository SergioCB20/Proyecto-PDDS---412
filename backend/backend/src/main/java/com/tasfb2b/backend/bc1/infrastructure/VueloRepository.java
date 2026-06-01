package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface VueloRepository extends JpaRepository<Vuelo, UUID>, JpaSpecificationExecutor<Vuelo> {
    Page<Vuelo> findByEstado(EstadoVuelo estado, Pageable pageable);
    Page<Vuelo> findByEstadoAndEsPlantilla(EstadoVuelo estado, boolean esPlantilla, Pageable pageable);
    Page<Vuelo> findByEstadoAndHoraSalidaBetween(EstadoVuelo estado, OffsetDateTime desde, OffsetDateTime hasta, Pageable pageable);
    Page<Vuelo> findByHoraSalidaBetween(OffsetDateTime desde, OffsetDateTime hasta, Pageable pageable);
    Page<Vuelo> findByDestinoCodigoIataAndEstado(String codigoIata, EstadoVuelo estado, Pageable pageable);
    List<Vuelo> findByEstadoAndHoraSalidaLessThanEqual(EstadoVuelo estado, OffsetDateTime hora);
    List<Vuelo> findByEstadoAndHoraLlegadaLessThanEqual(EstadoVuelo estado, OffsetDateTime hora);
    List<Vuelo> findByEstadoAndHoraSalidaBetween(EstadoVuelo estado, OffsetDateTime desde, OffsetDateTime hasta);
    List<Vuelo> findByHoraSalidaBetween(OffsetDateTime desde, OffsetDateTime hasta);
    List<Vuelo> findByEstadoIn(List<EstadoVuelo> estados);
    List<Vuelo> findByEstadoAndHoraSalidaBetweenAndEsPlantilla(EstadoVuelo estado, OffsetDateTime desde, OffsetDateTime hasta, boolean esPlantilla);
    List<Vuelo> findByHoraSalidaBetweenAndEsPlantilla(OffsetDateTime desde, OffsetDateTime hasta, boolean esPlantilla);
    List<Vuelo> findByEstadoAndHoraSalidaLessThanEqualAndEsPlantilla(EstadoVuelo estado, OffsetDateTime hora, boolean esPlantilla);
    List<Vuelo> findByEstadoAndHoraLlegadaLessThanEqualAndEsPlantilla(EstadoVuelo estado, OffsetDateTime hora, boolean esPlantilla);
    List<Vuelo> findByEstadoInAndEsPlantilla(List<EstadoVuelo> estados, boolean esPlantilla);
    long countByEstado(EstadoVuelo estado);
    long countByHoraSalidaBetween(OffsetDateTime desde, OffsetDateTime hasta);
}