package com.tasfb2b.backend.bc3.infrastructure;

import com.tasfb2b.backend.bc3.domain.Rol;
import com.tasfb2b.backend.bc3.domain.Usuario;
import com.tasfb2b.backend.bc3.infrastructure.RolRepository;
import com.tasfb2b.backend.bc3.infrastructure.UsuarioRepository;
import com.tasfb2b.backend.bc1.domain.PlanVuelos;
import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.infrastructure.PlanVuelosRepository;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Component
public class DataSeeder {

    private final RolRepository rolRepository;
    private final UsuarioRepository usuarioRepository;
    private final PlanVuelosRepository planVuelosRepository;
    private final NodoLogisticoRepository nodoRepository;
    private final VueloRepository vueloRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(RolRepository rolRepository, UsuarioRepository usuarioRepository,
                      PlanVuelosRepository planVuelosRepository, NodoLogisticoRepository nodoRepository,
                      VueloRepository vueloRepository, PasswordEncoder passwordEncoder) {
        this.rolRepository = rolRepository;
        this.usuarioRepository = usuarioRepository;
        this.planVuelosRepository = planVuelosRepository;
        this.nodoRepository = nodoRepository;
        this.vueloRepository = vueloRepository;
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
        seedBC1();

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

    private void seedBC1() {
        System.out.println("  - Seed BC1 (plan_vuelos, nodos, vuelos)");

        UUID planVuelosId = UUID.fromString("00000000-0000-0000-0002-000000000001");
        OffsetDateTime vigenciaDesde = OffsetDateTime.of(2025, 6, 1, 0, 0, 0, 0, ZoneOffset.UTC);
        OffsetDateTime vigenciaHasta = OffsetDateTime.of(2025, 12, 31, 23, 59, 59, 0, ZoneOffset.UTC);

        PlanVuelos planVuelos = planVuelosRepository.save(new PlanVuelos(
                planVuelosId, "Plan operativo inicial", vigenciaDesde, vigenciaHasta
        ));

        NodoLogistico lim = nodoRepository.save(new NodoLogistico(
                UUID.fromString("00000000-0000-0000-0003-000000000001"),
                "LIM", "Aeropuerto Jorge Chavez",
                new BigDecimal("-12.021900"), new BigDecimal("-77.114300"), 500
        ));

        NodoLogistico mia = nodoRepository.save(new NodoLogistico(
                UUID.fromString("00000000-0000-0000-0003-000000000002"),
                "MIA", "Miami International",
                new BigDecimal("25.795900"), new BigDecimal("-80.287000"), 800
        ));

        NodoLogistico bog = nodoRepository.save(new NodoLogistico(
                UUID.fromString("00000000-0000-0000-0003-000000000003"),
                "BOG", "El Dorado",
                new BigDecimal("4.701600"), new BigDecimal("-74.146900"), 600
        ));

        NodoLogistico gru = nodoRepository.save(new NodoLogistico(
                UUID.fromString("00000000-0000-0000-0003-000000000004"),
                "GRU", "Sao Paulo Guarulhos",
                new BigDecimal("-23.435600"), new BigDecimal("-46.473100"), 700
        ));

        NodoLogistico scl = nodoRepository.save(new NodoLogistico(
                UUID.fromString("00000000-0000-0000-0003-000000000005"),
                "SCL", "Arturo Merino Benitez",
                new BigDecimal("-33.393000"), new BigDecimal("-70.785800"), 400
        ));

        OffsetDateTime baseDate = OffsetDateTime.of(2025, 6, 15, 0, 0, 0, 0, ZoneOffset.UTC);

        crearVuelo(planVuelos, "LA2401", lim, mia, baseDate.plusHours(8), baseDate.plusHours(16), 200, 200);
        crearVuelo(planVuelos, "LA2402", mia, lim, baseDate.plusHours(18), baseDate.plusHours(2).plusDays(1), 200, 200);
        crearVuelo(planVuelos, "LA2040", lim, bog, baseDate.plusHours(6), baseDate.plusHours(9), 150, 150);
        crearVuelo(planVuelos, "LA2041", bog, lim, baseDate.plusHours(11), baseDate.plusHours(14), 150, 150);
        crearVuelo(planVuelos, "LA3501", lim, gru, baseDate.plusHours(10), baseDate.plusHours(16), 180, 180);
        crearVuelo(planVuelos, "LA3502", gru, lim, baseDate.plusHours(18), baseDate.now().plusHours(23), 180, 180);
        crearVuelo(planVuelos, "LA1020", scl, lim, baseDate.plusHours(7), baseDate.plusHours(10), 120, 120);
        crearVuelo(planVuelos, "LA1021", lim, scl, baseDate.plusHours(12), baseDate.plusHours(15), 120, 120);
        crearVuelo(planVuelos, "LA5001", bog, mia, baseDate.plusHours(14), baseDate.plusHours(18), 160, 160);
        crearVuelo(planVuelos, "LA5002", mia, bog, baseDate.plusHours(20), baseDate.now().plusHours(23), 160, 160);

        System.out.println("    5 nodos y 10 vuelos creados");
    }

    private void crearVuelo(PlanVuelos planVuelos, String codigo, NodoLogistico origen,
                             NodoLogistico destino, OffsetDateTime salida, OffsetDateTime llegada,
                             int capacidad, int disponible) {
        Vuelo vuelo = new Vuelo();
        vuelo.setId(UUID.randomUUID());
        vuelo.setPlanVuelos(planVuelos);
        vuelo.setCodigoVuelo(codigo);
        vuelo.setEstado(EstadoVuelo.PROGRAMADO);
        vuelo.setOrigen(origen);
        vuelo.setDestino(destino);
        vuelo.setOrigenLat(origen.getLatitud());
        vuelo.setOrigenLon(origen.getLongitud());
        vuelo.setDestinoLat(destino.getLatitud());
        vuelo.setDestinoLon(destino.getLongitud());
        vuelo.setCapacidadCarga(capacidad);
        vuelo.setCargaDisponible(disponible);
        vuelo.setHoraSalida(salida);
        vuelo.setHoraLlegada(llegada);
        vueloRepository.save(vuelo);
    }
}