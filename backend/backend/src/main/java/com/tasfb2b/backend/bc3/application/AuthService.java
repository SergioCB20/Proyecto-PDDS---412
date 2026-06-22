package com.tasfb2b.backend.bc3.application;

import com.tasfb2b.backend.bc3.domain.EstadoUsuario;
import com.tasfb2b.backend.bc3.domain.EntradaAuditoria;
import com.tasfb2b.backend.bc3.domain.Usuario;
import com.tasfb2b.backend.bc3.infrastructure.EntradaAuditoriaRepository;
import com.tasfb2b.backend.bc3.infrastructure.UsuarioRepository;
import com.tasfb2b.backend.shared.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final EntradaAuditoriaRepository auditoriaRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UsuarioRepository usuarioRepository,
                       EntradaAuditoriaRepository auditoriaRepository,
                       JwtUtil jwtUtil,
                       PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.auditoriaRepository = auditoriaRepository;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
    }

    public record LoginRequest(String correo, String password) {}
    public record LoginResponse(String token, UsuarioDto usuario) {}
    public record UsuarioDto(UUID id, String nombre, String correo, String rol, UUID nodo_ref_id) {}

    @Transactional
    public LoginResponse autenticar(String correo, String password) {
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new CredencialesInvalidasException("Credenciales inválidas"));

        if (usuario.getEstado() == EstadoUsuario.INACTIVO) {
            throw new UsuarioInactivoException("Usuario inactivo");
        }

        if (!passwordEncoder.matches(password, usuario.getHashPassword())) {
            usuario.setIntentosFallidos(usuario.getIntentosFallidos() + 1);
            usuarioRepository.save(usuario);
            throw new CredencialesInvalidasException("Credenciales inválidas");
        }

        usuario.setIntentosFallidos(0);
        usuario.setUltimoAcceso(OffsetDateTime.now());
        usuarioRepository.save(usuario);

        String token = jwtUtil.generarToken(
                usuario.getId(),
                usuario.getCorreo(),
                usuario.getRol().getNombre(),
                usuario.getNodoRefId()
        );

        auditoriaRepository.save(new EntradaAuditoria(
                UUID.randomUUID(),
                usuario.getId(),
                "LOGIN",
                "auth"
        ));

        UsuarioDto dto = new UsuarioDto(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getCorreo(),
                usuario.getRol().getNombre(),
                usuario.getNodoRefId()
        );

        return new LoginResponse(token, dto);
    }

    public static class CredencialesInvalidasException extends RuntimeException {
        public CredencialesInvalidasException(String msg) { super(msg); }
    }

    public static class UsuarioInactivoException extends RuntimeException {
        public UsuarioInactivoException(String msg) { super(msg); }
    }
}