package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.Maleta;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MaletaRepository extends JpaRepository<Maleta, UUID> {

    List<Maleta> findByEquipajeId(UUID equipajeId);

    List<Maleta> findByEquipajeIdIn(List<UUID> equipajeIds);

    boolean existsByCodigoMaleta(String codigoMaleta);
}
