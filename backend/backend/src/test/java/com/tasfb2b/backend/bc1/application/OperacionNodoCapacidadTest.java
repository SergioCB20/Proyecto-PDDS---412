package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OperacionNodoCapacidadTest {

    @Mock private NodoLogisticoRepository nodoRepository;
    private NodoService nodoService;
    private NodoLogistico spim;

    @BeforeEach
    void setUp() {
        nodoService = new NodoService(nodoRepository);
        spim = new NodoLogistico(UUID.randomUUID(), "SPIM", "Lima",
            BigDecimal.valueOf(-12.0), BigDecimal.valueOf(-77.0), 440);
    }

    @Test
    void actualizarCapacidad_happyPath() {
        when(nodoRepository.findByCodigoIata("SPIM")).thenReturn(Optional.of(spim));

        var response = nodoService.actualizarCapacidad("SPIM", 999);

        assertEquals(999, response.capacidadAlmacen());
        verify(nodoRepository).save(spim);
        assertEquals(999, spim.getCapacidadAlmacen());
    }

    @Test
    void actualizarCapacidad_capacidadInvalida_lanzaExcepcion() {
        assertThrows(IllegalArgumentException.class,
            () -> nodoService.actualizarCapacidad("SPIM", 0));
        assertThrows(IllegalArgumentException.class,
            () -> nodoService.actualizarCapacidad("SPIM", 10000));
        verifyNoInteractions(nodoRepository);
    }

    @Test
    void actualizarCapacidad_iataInexistente_lanzaExcepcion() {
        when(nodoRepository.findByCodigoIata("XXXX")).thenReturn(Optional.empty());

        assertThrows(NodoService.NodoNoEncontradoException.class,
            () -> nodoService.actualizarCapacidad("XXXX", 500));
    }

    @Test
    void restaurarCapacidad_happyPath() {
        spim.setCapacidadAlmacen(999);
        when(nodoRepository.findByCodigoIata("SPIM")).thenReturn(Optional.of(spim));

        var response = nodoService.restaurarCapacidad("SPIM");

        assertEquals(440, response.capacidadAlmacen());
        verify(nodoRepository).save(spim);
        assertEquals(440, spim.getCapacidadAlmacen());
    }

    @Test
    void restaurarCapacidad_iataInexistente_lanzaExcepcion() {
        when(nodoRepository.findByCodigoIata("XXXX")).thenReturn(Optional.empty());

        assertThrows(NodoService.NodoNoEncontradoException.class,
            () -> nodoService.restaurarCapacidad("XXXX"));
    }
}
