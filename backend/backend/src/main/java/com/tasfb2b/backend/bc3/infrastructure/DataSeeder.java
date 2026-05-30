package com.tasfb2b.backend.bc3.infrastructure;

import com.tasfb2b.backend.bc3.domain.Rol;
import com.tasfb2b.backend.bc3.domain.Usuario;
import com.tasfb2b.backend.bc3.infrastructure.RolRepository;
import com.tasfb2b.backend.bc3.infrastructure.UsuarioRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
public class DataSeeder {

    private final RolRepository rolRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(RolRepository rolRepository, UsuarioRepository usuarioRepository,
                      PasswordEncoder passwordEncoder) {
        this.rolRepository = rolRepository;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seed() {
        if (rolRepository.count() > 0) {
            System.out.println("=== DataSeeder: datos ya existen, omitiendo seed ===");
            return;
        }

        System.out.println("=== DataSeeder: ejecutando seed ===");

        seedBC3();

        System.out.println("=== DataSeeder: seed completado ===");
    }

    private void seedBC3() {
        System.out.println("  - Seed BC3 (roles y usuarios)");

        Rol admin = rolRepository.save(new Rol(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                "ADMINISTRADOR",
                "[\"USUARIOS_WRITE\",\"USUARIOS_READ\",\"VUELOS_READ\",\"NODOS_READ\"]"
        ));

        Rol operador = rolRepository.save(new Rol(
                UUID.fromString("00000000-0000-0000-0000-000000000002"),
                "OPERADOR_LOGISTICO",
                "[\"EQUIPAJES_WRITE\",\"VUELOS_READ\",\"NODOS_READ\",\"MANIFIESTOS_READ\",\"CANCELACION_WRITE\"]"
        ));

        Rol analista = rolRepository.save(new Rol(
                UUID.fromString("00000000-0000-0000-0000-000000000003"),
                "ANALISTA",
                "[\"SESIONES_WRITE\",\"SESIONES_READ\",\"VUELOS_READ\",\"NODOS_READ\"]"
        ));

        usuarioRepository.save(new Usuario(
                UUID.fromString("00000000-0000-0000-0001-000000000001"),
                admin, "Admin Sistema", "admin@tasfb2b.com",
                passwordEncoder.encode("admin123")
        ));

        usuarioRepository.save(new Usuario(
                UUID.fromString("00000000-0000-0000-0001-000000000002"),
                operador, "Operador Lima", "operador@tasfb2b.com",
                passwordEncoder.encode("operador123")
        ));

        usuarioRepository.save(new Usuario(
                UUID.fromString("00000000-0000-0000-0001-000000000003"),
                analista, "Analista Sim", "analista@tasfb2b.com",
                passwordEncoder.encode("analista123")
        ));
    }


}