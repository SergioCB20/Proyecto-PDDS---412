package com.tasfb2b.backend.bc3.application;

import com.tasfb2b.backend.bc3.domain.EstadoUsuario;
import com.tasfb2b.backend.bc3.domain.EntradaAuditoria;
import com.tasfb2b.backend.bc3.domain.Rol;
import com.tasfb2b.backend.bc3.domain.Usuario;
import com.tasfb2b.backend.bc3.infrastructure.EntradaAuditoriaRepository;
import com.tasfb2b.backend.bc3.infrastructure.RolRepository;
import com.tasfb2b.backend.bc3.infrastructure.UsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final EntradaAuditoriaRepository auditoriaRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository,
                          RolRepository rolRepository,
                          EntradaAuditoriaRepository auditoriaRepository,
                          PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.auditoriaRepository = auditoriaRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public record CrearUsuarioRequest(String nombre, String correo, String password, String rol, UUID nodoRefId) {}
    public record ActualizarUsuarioRequest(String nombre) {}
    public record CambiarEstadoRequest(String estado) {}

    public record UsuarioResponse(UUID id, String nombre, String correo, String rol, String estado, UUID nodoRefId, String nodoNombre) {}

    public Page<UsuarioResponse> listar(Optional<String> estado, Pageable pageable) {
        Page<Usuario> page;
        if (estado.isPresent()) {
            page = usuarioRepository.findByEstado(EstadoUsuario.valueOf(estado.get()), pageable);
        } else {
            page = usuarioRepository.findAll(pageable);
        }
        return page.map(this::toResponse);
    }

    @Transactional
    public UsuarioResponse crear(UUID actorId, CrearUsuarioRequest request) {
        if (usuarioRepository.existsByCorreo(request.correo())) {
            throw new CorreoYaExisteException("El correo ya está registrado");
        }

        Rol rol = rolRepository.findByNombre(request.rol())
                .orElseThrow(() -> new RolNoEncontradoException("Rol no encontrado: " + request.rol()));

        Usuario usuario = new Usuario(
                UUID.randomUUID(),
                rol,
                request.nombre(),
                request.correo(),
                passwordEncoder.encode(request.password())
        );
        usuario.setNodoRefId(request.nodoRefId());
        if (request.nodoRefId() != null) {
            usuario.setAsignadoEn(OffsetDateTime.now());
        }

        usuario = usuarioRepository.save(usuario);

        auditoriaRepository.save(new EntradaAuditoria(
                UUID.randomUUID(),
                actorId,
                "CREAR_USUARIO",
                usuario.getId().toString()
        ));

        return toResponse(usuario);
    }

    @Transactional
    public UsuarioResponse actualizar(UUID actorId, UUID usuarioId, ActualizarUsuarioRequest request) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new UsuarioNoEncontradoException("Usuario no encontrado"));

        usuario.setNombre(request.nombre());
        usuario = usuarioRepository.save(usuario);

        auditoriaRepository.save(new EntradaAuditoria(
                UUID.randomUUID(),
                actorId,
                "MODIFICAR_USUARIO",
                usuarioId.toString()
        ));

        return toResponse(usuario);
    }

    @Transactional
    public UsuarioResponse cambiarEstado(UUID actorId, UUID usuarioId, CambiarEstadoRequest request) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new UsuarioNoEncontradoException("Usuario no encontrado"));

        usuario.setEstado(EstadoUsuario.valueOf(request.estado()));
        usuario = usuarioRepository.save(usuario);

        auditoriaRepository.save(new EntradaAuditoria(
                UUID.randomUUID(),
                actorId,
                "CAMBIAR_ESTADO_USUARIO",
                usuarioId.toString() + " -> " + request.estado()
        ));

        return toResponse(usuario);
    }

    public UsuarioResponse obtener(UUID id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new UsuarioNoEncontradoException("Usuario no encontrado"));
        return toResponse(usuario);
    }

    private UsuarioResponse toResponse(Usuario usuario) {
        return new UsuarioResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getCorreo(),
                usuario.getRol().getNombre(),
                usuario.getEstado().name(),
                usuario.getNodoRefId(),
                null
        );
    }

    public static class UsuarioNoEncontradoException extends RuntimeException {
        public UsuarioNoEncontradoException(String msg) { super(msg); }
    }

    public static class CorreoYaExisteException extends RuntimeException {
        public CorreoYaExisteException(String msg) { super(msg); }
    }

    public static class RolNoEncontradoException extends RuntimeException {
        public RolNoEncontradoException(String msg) { super(msg); }
    }
}