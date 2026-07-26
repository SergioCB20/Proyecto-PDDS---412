package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.domain.PlanVuelos;
import com.tasfb2b.backend.bc1.infrastructure.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OperacionPreparacionPlanesTest {

    @Mock private NodoLogisticoRepository nodoRepository;
    @Mock private VueloRepository vueloRepository;
    @Mock private EquipajeRepository equipajeRepository;
    @Mock private PlanVuelosRepository planVuelosRepository;
    @Mock private ColaPlanificacionRepository colaPlanificacionRepository;
    @Mock private SegmentoPlanRepository segmentoPlanRepository;
    @Mock private PlanViajeRepository planViajeRepository;

    private OperacionPreparacionService service;
    private PlanVuelos planVuelos;

    @BeforeEach
    void setUp() {
        service = new OperacionPreparacionService(nodoRepository, vueloRepository,
            equipajeRepository, planVuelosRepository,
            colaPlanificacionRepository, segmentoPlanRepository, planViajeRepository);
        planVuelos = new PlanVuelos();
        planVuelos.setId(java.util.UUID.randomUUID());
        when(planVuelosRepository.findFirstByOrderByVigenciaDesdeAsc())
            .thenReturn(Optional.of(planVuelos));
    }

    @Test
    void cargarPlanes_noLlamaNodoRepository() {
        var archivo = new MockMultipartFile("archivo", "planes.txt", "text/plain",
            "SPIM-SABE-10:00-12:00-100".getBytes());

        var result = service.cargarPlanes(archivo, 11);

        assertEquals(0, result.get("planes_cargados"));
        // Only verifies parseAndSavePlanes runs; with no nodos seeded, 0 planes parsed
        verify(nodoRepository, never()).save(any());
        verify(nodoRepository, atMost(2)).findByCodigoIata(anyString());
        verify(vueloRepository, never()).save(any());
    }

    @Test
    void cargarPlanes_conArchivoVacio_retorna0() {
        var archivo = new MockMultipartFile("archivo", "planes.txt", "text/plain", "".getBytes());

        var result = service.cargarPlanes(archivo, 11);

        assertEquals(0, result.get("planes_cargados"));
        verify(nodoRepository, never()).save(any());
        verify(vueloRepository, never()).save(any());
    }

    @Test
    void cargarPlanes_sinLlamaSetCapacidades() {
        var archivo = new MockMultipartFile("archivo", "planes.txt", "text/plain", "".getBytes());

        service.cargarPlanes(archivo, 11);

        verify(nodoRepository, never()).findByCodigoIata(eq("SPIM"));
        verify(nodoRepository, never()).findByCodigoIata(eq("SABE"));
        verify(nodoRepository, never()).findByCodigoIata(eq("EKCH"));
        verify(nodoRepository, never()).findByCodigoIata(eq("VIDP"));
    }
}
