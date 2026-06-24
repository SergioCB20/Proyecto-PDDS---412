package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface VueloRepository extends JpaRepository<Vuelo, UUID>, JpaSpecificationExecutor<Vuelo> {
    Page<Vuelo> findByEstado(EstadoVuelo estado, Pageable pageable);
    Page<Vuelo> findByEstadoAndHoraSalidaBetween(EstadoVuelo estado, OffsetDateTime desde, OffsetDateTime hasta, Pageable pageable);
    Page<Vuelo> findByHoraSalidaBetween(OffsetDateTime desde, OffsetDateTime hasta, Pageable pageable);
    Page<Vuelo> findByDestinoCodigoIataAndEstado(String codigoIata, EstadoVuelo estado, Pageable pageable);
    List<Vuelo> findByEstadoAndHoraSalidaLessThanEqual(EstadoVuelo estado, OffsetDateTime hora);
    List<Vuelo> findByEstadoAndHoraLlegadaLessThanEqual(EstadoVuelo estado, OffsetDateTime hora);
    List<Vuelo> findByEstadoAndHoraSalidaBetween(EstadoVuelo estado, OffsetDateTime desde, OffsetDateTime hasta);
    List<Vuelo> findByEstadoIn(List<EstadoVuelo> estados);
    long countByEstado(EstadoVuelo estado);

    List<Vuelo> findByEstadoAndEsPlantillaAndHoraSalidaLessThanEqual(EstadoVuelo estado, Boolean esPlantilla, OffsetDateTime hora);
    List<Vuelo> findByEstadoAndEsPlantillaAndHoraLlegadaLessThanEqual(EstadoVuelo estado, Boolean esPlantilla, OffsetDateTime hora);
    List<Vuelo> findByEstadoInAndEsPlantilla(List<EstadoVuelo> estados, Boolean esPlantilla);

    /**
     * Vuelos relevantes para la telemetría en tiempo real: todos los EN_RUTA (visibles/
     * animados en el mapa) más los PROGRAMADO cuya salida cae dentro de la ventana virtual
     * actual. Evita transmitir miles de vuelos de días futuros ya clonados en cada tick.
     */
    @Query("SELECT v FROM Vuelo v WHERE v.esPlantilla = false AND ("
            + "v.estado = com.tasfb2b.backend.bc1.domain.EstadoVuelo.EN_RUTA "
            + "OR (v.estado = com.tasfb2b.backend.bc1.domain.EstadoVuelo.PROGRAMADO "
            + "AND v.horaSalida <= :hasta))")
    List<Vuelo> findTelemetriaVuelos(@Param("hasta") OffsetDateTime hasta);
    List<Vuelo> findByEstadoAndEsPlantillaAndHoraSalidaBetween(EstadoVuelo estado, Boolean esPlantilla, OffsetDateTime desde, OffsetDateTime hasta);
    Page<Vuelo> findByEstadoAndEsPlantilla(EstadoVuelo estado, Boolean esPlantilla, Pageable pageable);
    List<Vuelo> findByEsPlantilla(Boolean esPlantilla);
    List<Vuelo> findByEsPlantillaAndFechaOperacionBetween(Boolean esPlantilla, LocalDate desde, LocalDate hasta);

    @Query(value = "SELECT DISTINCT ON (v.codigo_vuelo) v.* FROM vuelos v WHERE v.es_plantilla = true ORDER BY v.codigo_vuelo, v.id", nativeQuery = true)
    List<Vuelo> findDistinctPlantillas();
    long countByEstadoAndEsPlantilla(EstadoVuelo estado, Boolean esPlantilla);

    @Query(value = "SELECT estado::text, COUNT(*)::bigint FROM vuelos WHERE es_plantilla = false GROUP BY estado", nativeQuery = true)
    List<Object[]> countByEstadoNotPlantillaGrouped();
    boolean existsByFechaOperacionAndEsPlantilla(LocalDate fechaOperacion, Boolean esPlantilla);
    boolean existsByFechaOperacionAndEstadoInAndEsPlantilla(LocalDate fechaOperacion, List<EstadoVuelo> estados, Boolean esPlantilla);
    long countByFechaOperacionAndEsPlantilla(LocalDate fechaOperacion, Boolean esPlantilla);

    @Modifying
    @Query("UPDATE Vuelo v SET v.cargaDisponible = v.cargaDisponible - :cantidad WHERE v.id = :id AND v.cargaDisponible >= :cantidad")
    int decrementarCargaDisponible(@Param("id") UUID id, @Param("cantidad") int cantidad);
}