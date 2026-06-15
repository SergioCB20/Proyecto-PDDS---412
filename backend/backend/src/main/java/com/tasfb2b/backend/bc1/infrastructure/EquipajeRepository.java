package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.EstadoEquipaje;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EquipajeRepository extends JpaRepository<Equipaje, UUID> {
    Optional<Equipaje> findByIdExterno(String idExterno);
    Page<Equipaje> findByEstado(EstadoEquipaje estado, Pageable pageable);
    List<Equipaje> findByVueloActualId(UUID vueloActualId);
    List<Equipaje> findByVueloActualIdIn(List<UUID> vueloActualIds);
    long countByVueloActualId(UUID vueloId);

    @Query("SELECT e FROM Equipaje e JOIN PlanViaje pv ON pv.equipaje = e " +
           "WHERE pv.sesionId = :sesionId AND e.vueloActual.id = :vueloId")
    List<Equipaje> findBySesionIdAndVueloActualId(
            @Param("sesionId") UUID sesionId,
            @Param("vueloId") UUID vueloId);

    @Query("SELECT e FROM Equipaje e JOIN PlanViaje pv ON pv.equipaje = e " +
           "WHERE pv.sesionId = :sesionId AND e.estado = :estado " +
           "AND e.vueloActual.destino.codigoIata = :nodoIata")
    List<Equipaje> findBySesionIdAndEstadoAndNodoIata(
            @Param("sesionId") UUID sesionId,
            @Param("estado") EstadoEquipaje estado,
            @Param("nodoIata") String nodoIata);
}