package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.*;
import com.tasfb2b.backend.bc1.infrastructure.*;
import com.tasfb2b.backend.bc2.domain.*;
import com.tasfb2b.backend.bc2.infrastructure.*;
import com.tasfb2b.backend.shared.events.VueloCanceladoEvent;
import com.tasfb2b.backend.shared.infrastructure.RedisCacheService;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TickServiceTest {

    @Mock private SesionRepository sesionRepository;
    @Mock private VueloRepository vueloRepository;
    @Mock private EquipajeRepository equipajeRepository;
    @Mock private SegmentoPlanRepository segmentoPlanRepository;
    @Mock private NodoLogisticoRepository nodoRepository;
    @Mock private EventoCancelacionRepository eventoCancelacionRepository;
    @Mock private LoteReplanificacionRepository loteReplanificacionRepository;
    @Mock private RedisCacheService redisCacheService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private TelemetriaService telemetriaService;

    private ObjectMapper objectMapper;
    private TickService tickService;

    private SesionEjecucion sesion;
    private NodoLogistico nodoOrigen;
    private NodoLogistico nodoDestino;
    private Vuelo vuelo;
    private Equipaje equipaje;
    private PlanViaje planViaje;
    private SegmentoPlan segmento;

    @Captor private ArgumentCaptor<VueloCanceladoEvent> eventCaptor;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        tickService = new TickService(
                sesionRepository, vueloRepository, equipajeRepository,
                segmentoPlanRepository, nodoRepository,
                eventoCancelacionRepository, loteReplanificacionRepository,
                redisCacheService, eventPublisher, telemetriaService, objectMapper);

        sesion = new SesionEjecucion(
                UUID.randomUUID(), TipoSesion.SIMULADA,
                LocalDate.of(2026, 5, 27), LocalTime.of(8, 0));
        sesion.setEstado(EstadoSesion.EN_CURSO);
        sesion.setDiaHoraVirtual(OffsetDateTime.parse("2026-05-27T08:00:00Z"));
        sesion.setSegundosRealesTranscurridos(0);
        sesion.setSlaAcumuladoPct(BigDecimal.valueOf(100));
        sesion.setVuelosCancelados(0);
        sesion.setMaletasReplanificadas(0);
        sesion.setProbCancelacion(BigDecimal.valueOf(0.1));
        sesion.setAlmacenRojoMax(BigDecimal.valueOf(100));

        nodoOrigen = new NodoLogistico(
                UUID.randomUUID(), "LIM", "Lima",
                BigDecimal.valueOf(-12.0), BigDecimal.valueOf(-77.0), 100);
        nodoDestino = new NodoLogistico(
                UUID.randomUUID(), "CUZ", "Cusco",
                BigDecimal.valueOf(-13.5), BigDecimal.valueOf(-72.0), 100);

        vuelo = new Vuelo();
        vuelo.setId(UUID.randomUUID());
        vuelo.setCodigoVuelo("LA2001");
        vuelo.setEstado(EstadoVuelo.PROGRAMADO);
        vuelo.setOrigen(nodoOrigen);
        vuelo.setDestino(nodoDestino);
        vuelo.setOrigenLat(BigDecimal.valueOf(-12.0));
        vuelo.setOrigenLon(BigDecimal.valueOf(-77.0));
        vuelo.setDestinoLat(BigDecimal.valueOf(-13.5));
        vuelo.setDestinoLon(BigDecimal.valueOf(-72.0));
        vuelo.setHoraSalida(OffsetDateTime.parse("2026-05-27T08:00:00Z"));
        vuelo.setHoraLlegada(OffsetDateTime.parse("2026-05-27T09:30:00Z"));
        vuelo.setCapacidadCarga(50);
        vuelo.setCargaDisponible(50);

        equipaje = new Equipaje();
        equipaje.setId(UUID.randomUUID());
        equipaje.setEstado(EstadoEquipaje.REGISTRADO);
        equipaje.setVueloActual(vuelo);
        equipaje.setDestinoIata("CUZ");
        equipaje.setSlaComprometido(OffsetDateTime.parse("2026-05-27T12:00:00Z"));

        planViaje = new PlanViaje();
        planViaje.setId(UUID.randomUUID());
        planViaje.setEquipaje(equipaje);

        segmento = new SegmentoPlan();
        segmento.setId(UUID.randomUUID());
        segmento.setPlanViaje(planViaje);
        segmento.setVuelo(vuelo);
        segmento.setNodoOrigen(nodoOrigen);
        segmento.setNodoDestino(nodoDestino);
        segmento.setOrden(1);
        segmento.setHoraSalidaProg(OffsetDateTime.parse("2026-05-27T08:00:00Z"));
        segmento.setEstado(EstadoSegmento.PENDIENTE);
    }

    @Test
    void tick_shouldAdvanceVirtualTime() {
        when(sesionRepository.findByEstado(EstadoSesion.EN_CURSO))
                .thenReturn(List.of(sesion));
        when(sesionRepository.save(any())).thenReturn(sesion);
        when(vueloRepository.findByEstadoAndHoraSalidaLessThanEqual(any(), any()))
                .thenReturn(List.of());
        when(vueloRepository.findByEstadoAndHoraLlegadaLessThanEqual(any(), any()))
                .thenReturn(List.of());
        when(nodoRepository.findAllByOrderByCodigoIataAsc())
                .thenReturn(List.of(nodoOrigen, nodoDestino));

        OffsetDateTime before = sesion.getDiaHoraVirtual();
        tickService.tick();

        assertNotNull(sesion.getDiaHoraVirtual());
        assertTrue(sesion.getDiaHoraVirtual().isAfter(before),
                "Virtual time should advance after tick");
        assertTrue(sesion.getSegundosRealesTranscurridos() >= 5,
                "Real seconds should increment by at least 5");
    }

    @Test
    void tick_shouldDetectDepartingFlights() {
        when(sesionRepository.findByEstado(EstadoSesion.EN_CURSO))
                .thenReturn(List.of(sesion));
        when(vueloRepository.findByEstadoAndHoraSalidaLessThanEqual(
                eq(EstadoVuelo.PROGRAMADO), any(OffsetDateTime.class)))
                .thenReturn(List.of(vuelo))
                .thenReturn(List.of());
        when(segmentoPlanRepository.findByVueloIdAndEstado(
                vuelo.getId(), EstadoSegmento.PENDIENTE))
                .thenReturn(List.of(segmento));
        when(vueloRepository.findByEstadoAndHoraLlegadaLessThanEqual(any(), any()))
                .thenReturn(List.of());
        when(nodoRepository.findAllByOrderByCodigoIataAsc())
                .thenReturn(List.of(nodoOrigen, nodoDestino));

        tickService.tick();

        assertEquals(EstadoVuelo.EN_RUTA, vuelo.getEstado(),
                "Flight should be EN_RUTA after departure detection");
        assertEquals(EstadoSegmento.EN_CURSO, segmento.getEstado(),
                "Segment should be EN_CURSO after departure");
        assertEquals(EstadoEquipaje.EN_VUELO, equipaje.getEstado(),
                "Equipaje should be EN_VUELO after departure");
    }

    @Test
    void tick_shouldDetectArrivingFlights() {
        vuelo.setEstado(EstadoVuelo.EN_RUTA);
        segmento.setEstado(EstadoSegmento.EN_CURSO);

        when(sesionRepository.findByEstado(EstadoSesion.EN_CURSO))
                .thenReturn(List.of(sesion));
        when(vueloRepository.findByEstadoAndHoraLlegadaLessThanEqual(
                any(EstadoVuelo.class), any(OffsetDateTime.class)))
                .thenReturn(List.of(vuelo));
        when(segmentoPlanRepository.findByVueloIdAndEstado(
                vuelo.getId(), EstadoSegmento.EN_CURSO))
                .thenReturn(List.of(segmento));
        when(vueloRepository.findByEstadoAndHoraSalidaLessThanEqual(any(), any()))
                .thenReturn(List.of());
        when(nodoRepository.findAllByOrderByCodigoIataAsc())
                .thenReturn(List.of(nodoOrigen, nodoDestino));

        tickService.tick();

        assertEquals(EstadoVuelo.COMPLETADO, vuelo.getEstado(),
                "Flight should be COMPLETADO after arrival detection");
        assertEquals(EstadoSegmento.COMPLETADO, segmento.getEstado(),
                "Segment should be COMPLETADO after arrival");
        assertEquals(EstadoEquipaje.ENTREGADO, equipaje.getEstado(),
                "Equipaje should be ENTREGADO after last segment arrival");
    }

    @Test
    void tick_shouldDetectCollapseWhenNodeOverThreshold() {
        nodoOrigen.setOcupacionActual(101);

        when(sesionRepository.findByEstado(EstadoSesion.EN_CURSO))
                .thenReturn(List.of(sesion));
        when(vueloRepository.findByEstadoAndHoraSalidaLessThanEqual(any(), any()))
                .thenReturn(List.of());
        when(vueloRepository.findByEstadoAndHoraLlegadaLessThanEqual(any(), any()))
                .thenReturn(List.of());
        when(nodoRepository.findAllByOrderByCodigoIataAsc())
                .thenReturn(List.of(nodoOrigen));

        tickService.tick();

        assertEquals(EstadoSesion.COLAPSADA, sesion.getEstado(),
                "Session should be COLAPSADA when node occupancy exceeds threshold");
        verify(redisCacheService, atLeastOnce()).setEstadoSesion(sesion.getId(), "COLAPSADA");
    }

    @Test
    void tick_shouldWriteMetricsToRedis() {
        when(sesionRepository.findByEstado(EstadoSesion.EN_CURSO))
                .thenReturn(List.of(sesion));
        when(vueloRepository.findByEstadoAndHoraSalidaLessThanEqual(any(), any()))
                .thenReturn(List.of());
        when(vueloRepository.findByEstadoAndHoraLlegadaLessThanEqual(any(), any()))
                .thenReturn(List.of());
        when(nodoRepository.findAllByOrderByCodigoIataAsc())
                .thenReturn(List.of(nodoOrigen, nodoDestino));

        tickService.tick();

        verify(redisCacheService).setMetricasSesion(eq(sesion.getId()), anyString());
        verify(redisCacheService).setEstadoSesion(eq(sesion.getId()), eq("EN_CURSO"));
    }

    @Test
    void tick_shouldProbabilisticCancelFlight() {
        sesion.setProbCancelacion(BigDecimal.valueOf(1.0));

        when(sesionRepository.findByEstado(EstadoSesion.EN_CURSO))
                .thenReturn(List.of(sesion));
        when(vueloRepository.findByEstadoAndHoraSalidaLessThanEqual(
                any(EstadoVuelo.class), any(OffsetDateTime.class)))
                .thenReturn(List.of(vuelo));
        when(vueloRepository.findByEstadoAndHoraLlegadaLessThanEqual(any(), any()))
                .thenReturn(List.of());
        when(equipajeRepository.findByVueloActualId(vuelo.getId()))
                .thenReturn(List.of(equipaje));
        when(nodoRepository.findAllByOrderByCodigoIataAsc())
                .thenReturn(List.of(nodoOrigen, nodoDestino));

        tickService.tick();

        assertEquals(EstadoVuelo.CANCELADO, vuelo.getEstado(),
                "Flight should be CANCELADO after probabilistic cancellation at 100%");
        assertEquals(EstadoEquipaje.EN_REPLANIFICACION, equipaje.getEstado(),
                "Equipaje should be EN_REPLANIFICACION after flight cancellation");
        assertTrue(sesion.getVuelosCancelados() >= 1,
                "Session should record at least 1 cancelled flight");
        verify(eventPublisher).publishEvent(any(VueloCanceladoEvent.class));
    }

    @Test
    void tick_shouldNotRunForNonEnCursoSessions() {
        sesion.setEstado(EstadoSesion.CONFIGURADA);
        when(sesionRepository.findByEstado(EstadoSesion.EN_CURSO))
                .thenReturn(List.of());

        tickService.tick();

        verifyNoInteractions(vueloRepository);
        verifyNoInteractions(redisCacheService);
    }
}
