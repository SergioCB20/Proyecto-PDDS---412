package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NodoLogisticoRepository extends JpaRepository<NodoLogistico, UUID> {
    Optional<NodoLogistico> findByCodigoIata(String codigoIata);
    List<NodoLogistico> findAllByOrderByCodigoIataAsc();

    @Modifying
    @Query("UPDATE NodoLogistico n SET n.ocupacionActual = n.ocupacionActual + :delta WHERE n.id = :id")
    void actualizarOcupacion(@Param("id") UUID id, @Param("delta") int delta);
}