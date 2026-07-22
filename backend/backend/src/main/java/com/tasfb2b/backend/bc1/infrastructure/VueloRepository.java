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
import java.util.Optional;
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
    List<Vuelo> findByEstadoInAndEsPlantillaAndFechaOperacion(List<EstadoVuelo> estados, Boolean esPlantilla, LocalDate fechaOperacion);

     /**
      * Vuelos relevantes para la telemetría en tiempo real.
      *
      * Para evitar que vuelos "huérfanos" de sesiones anteriores (que quedaron EN_RUTA sin
      * procesarse al colapsar/finalizar y cuyo virtual time ya no aplica) contaminen el mapa
      * como duplicados, limitamos los EN_RUTA a la ventana virtual ± 1 día alrededor del
      * virtual actual. Los PROGRAMADO se siguen filtrando por hora_salida <= ventana.
      * Los CANCELADO se incluyen dentro de la ventana de fechaOperacion para que el panel
      * pueda mostrar el estado "Cancelado" y confirmar visualmente la cancelación.
      *
      * El parámetro {@code desde} representa el virtual actual − 1 día y {@code hasta}
      * el virtual actual + 1 día. La pequeña holgura evita flickering cuando un vuelo sale
      * minutos antes de medianoche virtual.
      */
     @Query("SELECT v FROM Vuelo v WHERE v.esPlantilla = false AND ("
            + "(v.estado = com.tasfb2b.backend.bc1.domain.EstadoVuelo.EN_RUTA "
            + "  AND v.fechaOperacion >= :desde AND v.fechaOperacion <= :hastaHasta) "
            + "OR (v.estado = com.tasfb2b.backend.bc1.domain.EstadoVuelo.PROGRAMADO "
            + "  AND v.horaSalida >= :desdeVirtual AND v.horaSalida <= :hasta) "
            + "OR (v.estado = com.tasfb2b.backend.bc1.domain.EstadoVuelo.CANCELADO "
            + "  AND v.fechaOperacion >= :desde AND v.fechaOperacion <= :hastaHasta))")
    List<Vuelo> findTelemetriaVuelos(@Param("desde") LocalDate desde,
                                     @Param("hastaHasta") LocalDate hastaHasta,
                                     @Param("desdeVirtual") OffsetDateTime desdeVirtual,
                                     @Param("hasta") OffsetDateTime hasta);
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

    Optional<Vuelo> findFirstByCodigoVueloAndEsPlantillaFalseAndFechaOperacion(
            String codigoVuelo, LocalDate fechaOperacion);

    @Modifying
    @Query("UPDATE Vuelo v SET v.cargaDisponible = v.cargaDisponible - :cantidad WHERE v.id = :id AND v.cargaDisponible >= :cantidad")
    int decrementarCargaDisponible(@Param("id") UUID id, @Param("cantidad") int cantidad);

    @Modifying
    @Query("UPDATE Vuelo v SET v.cargaDisponible = v.cargaDisponible + :cantidad WHERE v.id = :id")
    int incrementarCargaDisponible(@Param("id") UUID id, @Param("cantidad") int cantidad);

    @Query("SELECT COUNT(v) FROM Vuelo v WHERE v.fechaOperacion = :fecha AND v.esPlantilla = false AND v.estado <> com.tasfb2b.backend.bc1.domain.EstadoVuelo.PROGRAMADO")
    long countByFechaOperacionAndEstadoNotProgramado(@Param("fecha") LocalDate fecha);

    @Query("SELECT COUNT(v) FROM Vuelo v WHERE v.fechaOperacion = :fecha AND v.esPlantilla = false AND v.estado = :estado")
    long countByFechaOperacionAndEstado(@Param("fecha") LocalDate fecha, @Param("estado") EstadoVuelo estado);
}