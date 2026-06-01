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

import java.util.List;

@ExtendWith(MockitoExtension.class)
class MotorEnrutamientoTest {

    @Mock private VueloRepository vueloRepository;
    @Mock private NodoLogisticoRepository nodoRepository;
    @Mock private RoutingStrategy greedyStrategy;
    @Mock private RoutingStrategy acoStrategy;

    private MotorEnrutamiento motor;

    private NodoLogistico origen;
    private NodoLogistico destino;

    private OffsetDateTime sla;

    @BeforeEach
    void setUp() {
        motor = new MotorEnrutamiento(vueloRepository, nodoRepository, greedyStrategy, acoStrategy);

        origen = new NodoLogistico(
                UUID.randomUUID(), "LIM", "Lima",
                BigDecimal.valueOf(-12.0), BigDecimal.valueOf(-77.0), 500);
        destino = new NodoLogistico(
                UUID.randomUUID(), "MIA", "Miami",
                BigDecimal.valueOf(25.8), BigDecimal.valueOf(-80.3), 500);

        sla = OffsetDateTime.parse("2025-06-16T08:00:00Z");
    }

    @Test
    void shouldDelegateToStrategyWhenDestinationFound() {
        Vuelo vuelo = new Vuelo();
        vuelo.setId(UUID.randomUUID());
        vuelo.setCodigoVuelo("LA2400");
        vuelo.setEstado(EstadoVuelo.PROGRAMADO);
        vuelo.setOrigen(origen);
        vuelo.setDestino(destino);
        vuelo.setCargaDisponible(10);
        vuelo.setHoraSalida(OffsetDateTime.parse("2025-06-15T14:00:00Z"));
        vuelo.setHoraLlegada(OffsetDateTime.parse("2025-06-15T22:00:00Z"));

        when(nodoRepository.findByCodigoIata("MIA")).thenReturn(Optional.of(destino));
        when(vueloRepository.findByEstadoAndEsPlantilla(eq(EstadoVuelo.PROGRAMADO), eq(false), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(vuelo)));

        RutaResult expected = new RutaResult(
                List.of(new SegmentoInfo(1, vuelo.getId(), "LA2400",
                        origen.getId(), "LIM", destino.getId(), "MIA",
                        vuelo.getHoraSalida(), vuelo.getHoraLlegada())),
                true, null);
        when(greedyStrategy.calcularRuta(origen, destino, sla, List.of(vuelo), 1))
                .thenReturn(expected);

        RutaResult result = motor.calcularRuta(origen, "MIA", sla);

        assertTrue(result.exitoso());
        assertEquals(1, result.segmentos().size());
        verify(greedyStrategy).calcularRuta(origen, destino, sla, List.of(vuelo), 1);
    }

    @Test
    void destinationNotFound_shouldReturnErrorWithoutCallingStrategy() {
        when(nodoRepository.findByCodigoIata("XYZ")).thenReturn(Optional.empty());

        RutaResult result = motor.calcularRuta(origen, "XYZ", sla);

        assertFalse(result.exitoso());
        assertNotNull(result.mensajeError());
        assertTrue(result.mensajeError().contains("no encontrado"));
        verify(greedyStrategy, never()).calcularRuta(any(), any(), any(), anyList(), anyInt());
    }

    @Test
    void strategyFailure_shouldPropagateError() {
        when(nodoRepository.findByCodigoIata("MIA")).thenReturn(Optional.of(destino));
        when(vueloRepository.findByEstadoAndEsPlantilla(eq(EstadoVuelo.PROGRAMADO), eq(false), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        when(greedyStrategy.calcularRuta(origen, destino, sla, List.of(), 1))
                .thenReturn(RutaResult.sinRuta("No hay vuelos disponibles"));

        RutaResult result = motor.calcularRuta(origen, "MIA", sla);

        assertFalse(result.exitoso());
        assertTrue(result.mensajeError().contains("No hay vuelos disponibles"));
    }

}
