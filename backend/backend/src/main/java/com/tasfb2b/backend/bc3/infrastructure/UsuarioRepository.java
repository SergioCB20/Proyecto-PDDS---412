package com.tasfb2b.backend.bc3.infrastructure;

import com.tasfb2b.backend.bc3.domain.EstadoUsuario;
import com.tasfb2b.backend.bc3.domain.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {
    Optional<Usuario> findByCorreo(String correo);
    Page<Usuario> findByEstado(EstadoUsuario estado, Pageable pageable);
    boolean existsByCorreo(String correo);
}