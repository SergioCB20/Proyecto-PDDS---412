package com.tasfb2b.backend.bc3.infrastructure;

import com.tasfb2b.backend.bc3.domain.Usuario;
import com.tasfb2b.backend.bc3.infrastructure.UsuarioRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
public class DataSeeder {

    private final UsuarioRepository usuarioRepository;

    public DataSeeder(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seed() {
        if (usuarioRepository.count() > 0) {
            System.out.println("=== DataSeeder: datos ya existen, omitiendo seed ===");
            return;
        }

        System.out.println("=== DataSeeder: ejecutando seed ===");

        usuarioRepository.save(new Usuario(
                UUID.fromString("00000000-0000-0000-0001-000000000001"),
                "Operador Generico",
                "operador@tasfb2b.com"
        ));

        System.out.println("=== DataSeeder: seed completado ===");
    }
}
