package com.tasfb2b.backend.bc3.infrastructure;

import com.tasfb2b.backend.bc3.domain.EntradaAuditoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface EntradaAuditoriaRepository extends JpaRepository<EntradaAuditoria, UUID> {
    List<EntradaAuditoria> findByUsuarioIdOrderByOcurridoEnDesc(UUID usuarioId);
}