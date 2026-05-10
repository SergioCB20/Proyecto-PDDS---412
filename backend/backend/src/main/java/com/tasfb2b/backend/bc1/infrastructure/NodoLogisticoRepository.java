package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NodoLogisticoRepository extends JpaRepository<NodoLogistico, UUID> {
    Optional<NodoLogistico> findByCodigoIata(String codigoIata);
    List<NodoLogistico> findAllByOrderByCodigoIataAsc();
}