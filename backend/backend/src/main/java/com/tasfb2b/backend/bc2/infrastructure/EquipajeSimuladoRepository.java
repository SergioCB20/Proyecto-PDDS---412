package com.tasfb2b.backend.bc2.infrastructure;

import com.tasfb2b.backend.bc2.domain.EquipajeSimulado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface EquipajeSimuladoRepository extends JpaRepository<EquipajeSimulado, UUID> {

    List<EquipajeSimulado> findBySesionIdAndFechaIngresoVirtualLessThanEqualAndProcesadoFalse(UUID sesionId, OffsetDateTime fecha);

    @Modifying
    @Query("UPDATE EquipajeSimulado e SET e.procesado = true WHERE e.id IN :ids")
    void marcarComoProcesados(List<UUID> ids);

    @Modifying
    @Query("DELETE FROM EquipajeSimulado e WHERE e.sesionId = :sesionId")
    void eliminarPorSesionId(UUID sesionId);
}
