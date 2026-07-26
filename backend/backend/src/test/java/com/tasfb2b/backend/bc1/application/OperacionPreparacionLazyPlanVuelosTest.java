package com.tasfb2b.backend.bc1.application;

import com.tasfb2b.backend.bc1.infrastructure.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OperacionPreparacionLazyPlanVuelosTest {

    @Mock private NodoLogisticoRepository nodoRepository;
    @Mock private VueloRepository vueloRepository;
    @Mock private EquipajeRepository equipajeRepository;
    @Mock private PlanVuelosRepository planVuelosRepository;
    @Mock private ColaPlanificacionRepository colaPlanificacionRepository;
    @Mock private SegmentoPlanRepository segmentoPlanRepository;
    @Mock private PlanViajeRepository planViajeRepository;

    private OperacionPreparacionService service;

    @BeforeEach
    void setUp() {
        service = new OperacionPreparacionService(nodoRepository, vueloRepository,
            equipajeRepository, planVuelosRepository,
            colaPlanificacionRepository, segmentoPlanRepository, planViajeRepository);
    }

    @Test
    void cargarPlanes_sinPlanVuelos_lanzaExcepcion() {
        when(planVuelosRepository.findFirstByOrderByVigenciaDesdeAsc())
            .thenReturn(Optional.empty());

        var archivo = new MockMultipartFile("archivo", "planes.txt", "text/plain",
            "SPIM-SABE-10:00-12:00-100".getBytes());

        var ex = assertThrows(IllegalStateException.class,
            () -> service.cargarPlanes(archivo, 11));
        assertTrue(ex.getMessage().contains("No existe PlanVuelos base"));
    }
}
