package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.Equipaje;
import com.tasfb2b.backend.bc1.domain.EstadoEquipaje;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
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
}