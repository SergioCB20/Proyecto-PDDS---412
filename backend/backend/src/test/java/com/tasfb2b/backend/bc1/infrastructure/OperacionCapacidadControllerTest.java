package com.tasfb2b.backend.bc1.infrastructure;

import com.tasfb2b.backend.bc1.application.NodoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OperacionCapacidadControllerTest {

    @Mock private NodoService nodoService;
    private OperacionCapacidadController controller;

    @BeforeEach
    void setUp() {
        controller = new OperacionCapacidadController(nodoService);
    }

    @Test
    void setCapacidad_200() {
        var request = new NodoService.CapacidadRequest(999);
        var expectedResponse = mock(NodoService.NodoResponse.class);
        when(nodoService.actualizarCapacidad("SPIM", 999)).thenReturn(expectedResponse);

        var response = controller.setCapacidad("spim", request);

        assertEquals(200, response.getStatusCode().value());
        assertSame(expectedResponse, response.getBody());
    }

    @Test
    void setCapacidad_capacidadInvalida_lanzaExcepcion() {
        var request = new NodoService.CapacidadRequest(0);
        when(nodoService.actualizarCapacidad("SPIM", 0))
            .thenThrow(new IllegalArgumentException("Capacidad debe estar entre 1 y 9999"));

        assertThrows(IllegalArgumentException.class,
            () -> controller.setCapacidad("SPIM", request));
    }

    @Test
    void setCapacidad_iataInexistente_lanzaExcepcion() {
        var request = new NodoService.CapacidadRequest(500);
        when(nodoService.actualizarCapacidad("XXXX", 500))
            .thenThrow(new NodoService.NodoNoEncontradoException("Nodo no encontrado: XXXX"));

        assertThrows(NodoService.NodoNoEncontradoException.class,
            () -> controller.setCapacidad("XXXX", request));
    }

    @Test
    void restaurarCapacidad_200() {
        var expectedResponse = mock(NodoService.NodoResponse.class);
        when(nodoService.restaurarCapacidad("SPIM")).thenReturn(expectedResponse);

        var response = controller.restaurarCapacidad("spim");

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
    }
}
