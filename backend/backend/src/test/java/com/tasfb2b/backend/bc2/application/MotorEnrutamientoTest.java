package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MotorEnrutamientoTest {

    @Mock private VueloRepository vueloRepository;
    @Mock private NodoLogisticoRepository nodoRepository;

    private MotorEnrutamiento motor;

    private NodoLogistico origen;
    private NodoLogistico escala;
    private NodoLogistico destino;
    private NodoLogistico destinoLejano;

    private Vuelo directo;
    private Vuelo primerTramo;
    private Vuelo segundoTramo;

    private OffsetDateTime sla;

    @BeforeEach
    void setUp() {
        motor = new MotorEnrutamiento(vueloRepository, nodoRepository);

        origen = new NodoLogistico(
                UUID.randomUUID(), "LIM", "Lima",
                BigDecimal.valueOf(-12.0), BigDecimal.valueOf(-77.0), 500);
        escala = new NodoLogistico(
                UUID.randomUUID(), "BOG", "Bogota",
                BigDecimal.valueOf(4.7), BigDecimal.valueOf(-74.2), 500);
        destino = new NodoLogistico(
                UUID.randomUUID(), "MIA", "Miami",
                BigDecimal.valueOf(25.8), BigDecimal.valueOf(-80.3), 500);
        destinoLejano = new NodoLogistico(
                UUID.randomUUID(), "SCL", "Santiago",
                BigDecimal.valueOf(-33.4), BigDecimal.valueOf(-70.7), 500);

        sla = OffsetDateTime.parse("2025-06-16T08:00:00Z");

        directo = new Vuelo();
        directo.setId(UUID.randomUUID());
        directo.setCodigoVuelo("LA2400");
        directo.setEstado(EstadoVuelo.PROGRAMADO);
        directo.setOrigen(origen);
        directo.setDestino(destino);
        directo.setCargaDisponible(10);
        directo.setHoraSalida(OffsetDateTime.parse("2025-06-15T14:00:00Z"));
        directo.setHoraLlegada(OffsetDateTime.parse("2025-06-15T22:00:00Z"));

        primerTramo = new Vuelo();
        primerTramo.setId(UUID.randomUUID());
        primerTramo.setCodigoVuelo("LA2001");
        primerTramo.setEstado(EstadoVuelo.PROGRAMADO);
        primerTramo.setOrigen(origen);
        primerTramo.setDestino(escala);
        primerTramo.setCargaDisponible(5);
        primerTramo.setHoraSalida(OffsetDateTime.parse("2025-06-15T14:00:00Z"));
        primerTramo.setHoraLlegada(OffsetDateTime.parse("2025-06-15T16:00:00Z"));

        segundoTramo = new Vuelo();
        segundoTramo.setId(UUID.randomUUID());
        segundoTramo.setCodigoVuelo("AA900");
        segundoTramo.setEstado(EstadoVuelo.PROGRAMADO);
        segundoTramo.setOrigen(escala);
        segundoTramo.setDestino(destino);
        segundoTramo.setCargaDisponible(8);
        segundoTramo.setHoraSalida(OffsetDateTime.parse("2025-06-15T17:30:00Z"));
        segundoTramo.setHoraLlegada(OffsetDateTime.parse("2025-06-15T21:00:00Z"));
    }

    @Test
    void directFlight_shouldReturnSingleSegment() {
        when(nodoRepository.findByCodigoIata("MIA")).thenReturn(Optional.of(destino));
        when(vueloRepository.findByEstado(eq(EstadoVuelo.PROGRAMADO), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(directo)));

        MotorEnrutamiento.RutaResult result = motor.calcularRuta(origen, "MIA", sla);

        assertTrue(result.exitoso());
        assertEquals(1, result.segmentos().size());
        assertEquals("LA2400", result.segmentos().get(0).vueloCodigo());
        assertEquals("LIM", result.segmentos().get(0).nodoOrigenIata());
        assertEquals("MIA", result.segmentos().get(0).nodoDestinoIata());
    }

    @Test
    void directFlight_shouldPrioritizeEarliestDeparture() {
        Vuelo tarde = new Vuelo();
        tarde.setId(UUID.randomUUID());
        tarde.setCodigoVuelo("LA2402");
        tarde.setEstado(EstadoVuelo.PROGRAMADO);
        tarde.setOrigen(origen);
        tarde.setDestino(destino);
        tarde.setCargaDisponible(3);
        tarde.setHoraSalida(OffsetDateTime.parse("2025-06-15T18:00:00Z"));
        tarde.setHoraLlegada(OffsetDateTime.parse("2025-06-16T02:00:00Z"));

        when(nodoRepository.findByCodigoIata("MIA")).thenReturn(Optional.of(destino));
        when(vueloRepository.findByEstado(eq(EstadoVuelo.PROGRAMADO), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(tarde, directo)));

        MotorEnrutamiento.RutaResult result = motor.calcularRuta(origen, "MIA", sla);

        assertTrue(result.exitoso());
        assertEquals("LA2400", result.segmentos().get(0).vueloCodigo(),
                "Should choose earliest departure when both flights are available");
    }

    @Test
    void twoLegConnection_shouldReturnTwoSegments() {
        when(nodoRepository.findByCodigoIata("MIA")).thenReturn(Optional.of(destino));
        when(vueloRepository.findByEstado(eq(EstadoVuelo.PROGRAMADO), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(primerTramo, segundoTramo)));

        MotorEnrutamiento.RutaResult result = motor.calcularRuta(origen, "MIA", sla);

        assertTrue(result.exitoso());
        assertEquals(2, result.segmentos().size());
        assertEquals("LA2001", result.segmentos().get(0).vueloCodigo());
        assertEquals("AA900", result.segmentos().get(1).vueloCodigo());
    }

    @Test
    void twoLegConnection_shouldRespectMin60MinutesConnection() {
        Vuelo muyTemprano = new Vuelo();
        muyTemprano.setId(UUID.randomUUID());
        muyTemprano.setCodigoVuelo("AA901");
        muyTemprano.setEstado(EstadoVuelo.PROGRAMADO);
        muyTemprano.setOrigen(escala);
        muyTemprano.setDestino(destino);
        muyTemprano.setCargaDisponible(8);
        muyTemprano.setHoraSalida(OffsetDateTime.parse("2025-06-15T16:10:00Z"));
        muyTemprano.setHoraLlegada(OffsetDateTime.parse("2025-06-15T19:30:00Z"));

        when(nodoRepository.findByCodigoIata("MIA")).thenReturn(Optional.of(destino));
        when(vueloRepository.findByEstado(eq(EstadoVuelo.PROGRAMADO), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(primerTramo, muyTemprano, segundoTramo)));

        MotorEnrutamiento.RutaResult result = motor.calcularRuta(origen, "MIA", sla);

        assertTrue(result.exitoso());
        assertEquals(2, result.segmentos().size());
        assertEquals("AA900", result.segmentos().get(1).vueloCodigo(),
                "Should skip connection with < 60 min, use later one with >= 60 min");
    }

    @Test
    void noRoute_shouldReturnError() {
        NodoLogistico scl = new NodoLogistico(
                UUID.randomUUID(), "SCL", "Santiago",
                BigDecimal.valueOf(-33.4), BigDecimal.valueOf(-70.7), 500);

        when(nodoRepository.findByCodigoIata("SCL")).thenReturn(Optional.of(scl));
        when(vueloRepository.findByEstado(eq(EstadoVuelo.PROGRAMADO), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        MotorEnrutamiento.RutaResult result = motor.calcularRuta(origen, "SCL", sla);

        assertFalse(result.exitoso());
        assertTrue(result.segmentos().isEmpty());
        assertNotNull(result.mensajeError());
    }

    @Test
    void capacityExhausted_shouldReturnError() {
        Vuelo sinCapacidad = new Vuelo();
        sinCapacidad.setId(UUID.randomUUID());
        sinCapacidad.setCodigoVuelo("LA2400");
        sinCapacidad.setEstado(EstadoVuelo.PROGRAMADO);
        sinCapacidad.setOrigen(origen);
        sinCapacidad.setDestino(destino);
        sinCapacidad.setCargaDisponible(0);
        sinCapacidad.setHoraSalida(OffsetDateTime.parse("2025-06-15T14:00:00Z"));
        sinCapacidad.setHoraLlegada(OffsetDateTime.parse("2025-06-15T22:00:00Z"));

        when(nodoRepository.findByCodigoIata("MIA")).thenReturn(Optional.of(destino));
        when(vueloRepository.findByEstado(eq(EstadoVuelo.PROGRAMADO), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(sinCapacidad)));

        MotorEnrutamiento.RutaResult result = motor.calcularRuta(origen, "MIA", sla);

        assertFalse(result.exitoso());
        assertTrue(result.segmentos().isEmpty());
    }

    @Test
    void destinationNotFound_shouldReturnError() {
        when(nodoRepository.findByCodigoIata("XYZ")).thenReturn(Optional.empty());

        MotorEnrutamiento.RutaResult result = motor.calcularRuta(origen, "XYZ", sla);

        assertFalse(result.exitoso());
        assertNotNull(result.mensajeError());
        assertTrue(result.mensajeError().contains("no encontrado"));
    }

    @Test
    void slaViolated_shouldNotIncludeLateFlight() {
        Vuelo tarde = new Vuelo();
        tarde.setId(UUID.randomUUID());
        tarde.setCodigoVuelo("LA2499");
        tarde.setEstado(EstadoVuelo.PROGRAMADO);
        tarde.setOrigen(origen);
        tarde.setDestino(destino);
        tarde.setCargaDisponible(5);
        tarde.setHoraSalida(OffsetDateTime.parse("2025-06-15T14:00:00Z"));
        tarde.setHoraLlegada(OffsetDateTime.parse("2025-06-16T10:00:00Z"));

        when(nodoRepository.findByCodigoIata("MIA")).thenReturn(Optional.of(destino));
        when(vueloRepository.findByEstado(eq(EstadoVuelo.PROGRAMADO), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(tarde)));

        MotorEnrutamiento.RutaResult result = motor.calcularRuta(origen, "MIA", sla);

        assertFalse(result.exitoso(),
                "Should not return a flight that violates SLA");
    }
}
