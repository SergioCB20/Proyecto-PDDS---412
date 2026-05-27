package com.tasfb2b.backend.bc2.infrastructure;

import com.tasfb2b.backend.bc2.domain.ItemLote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ItemLoteRepository extends JpaRepository<ItemLote, UUID> {
    List<ItemLote> findByLoteId(UUID loteId);
}
