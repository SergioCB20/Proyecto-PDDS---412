package com.tasfb2b.backend.bc2.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tasfb2b.backend.bc1.domain.EstadoVuelo;
import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import com.tasfb2b.backend.bc2.domain.EstadoSesion;
import com.tasfb2b.backend.bc2.domain.SesionEjecucion;
import com.tasfb2b.backend.bc2.domain.TipoSesion;
import com.tasfb2b.backend.bc2.infrastructure.TelemetriaWebSocket;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TelemetriaServiceTest {

    @Mock private NodoLogisticoRepository nodoRepository;
    @Mock private VueloRepository vueloRepository;
    @Mock private TelemetriaWebSocket telemetriaWebSocket;

    private ObjectMapper objectMapper;
    private TelemetriaService telemetriaService;
    private SesionEjecucion sesion;
    private NodoLogistico nodo;
    private Vuelo vuelo;

    @Captor private ArgumentCaptor<String> jsonCaptor;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        telemetriaService = new TelemetriaService(
                nodoRepository, vueloRepository, telemetriaWebSocket);

        sesion = new SesionEjecucion(
                UUID.randomUUID(), TipoSesion.SIMULADA,
                LocalDate.of(2026, 5, 27), LocalTime.of(8, 0));
        sesion.setEstado(EstadoSesion.EN_CURSO);
        sesion.setDiaHoraVirtual(OffsetDateTime.parse("2026-05-27T08:30:00Z"));
        sesion.setSegundosRealesTranscurridos(300);
        sesion.setSlaAcumuladoPct(BigDecimal.valueOf(95.5));
        sesion.setVuelosCancelados(2);
        sesion.setMaletasReplanificadas(5);
        sesion.setAlmacenVerdeMax(BigDecimal.valueOf(70));
        sesion.setAlmacenAmbarMax(BigDecimal.valueOf(90));
        sesion.setVueloVerdeMax(BigDecimal.valueOf(70));
        sesion.setVueloAmbarMax(BigDecimal.valueOf(90));

        nodo = new NodoLogistico(
                UUID.randomUUID(), "LIM", "Lima",
                BigDecimal.valueOf(-12.0), BigDecimal.valueOf(-77.0), 100);
        nodo.setOcupacionActual(45);

        vuelo = new Vuelo();
        vuelo.setId(UUID.randomUUID());
        vuelo.setCodigoVuelo("LA2001");
        vuelo.setEstado(EstadoVuelo.EN_RUTA);
        vuelo.setOrigenLat(BigDecimal.valueOf(-12.0));
        vuelo.setOrigenLon(BigDecimal.valueOf(-77.0));
        vuelo.setDestinoLat(BigDecimal.valueOf(-13.5));
        vuelo.setDestinoLon(BigDecimal.valueOf(-72.0));
        vuelo.setHoraSalida(OffsetDateTime.parse("2026-05-27T08:00:00Z"));
        vuelo.setHoraLlegada(OffsetDateTime.parse("2026-05-27T09:30:00Z"));
        vuelo.setCapacidadCarga(50);
        vuelo.setCargaDisponible(20);

        NodoLogistico origen = new NodoLogistico(
                UUID.randomUUID(), "LIM", "Lima",
                BigDecimal.valueOf(-12.0), BigDecimal.valueOf(-77.0), 100);
        NodoLogistico destino = new NodoLogistico(
                UUID.randomUUID(), "CUZ", "Cusco",
                BigDecimal.valueOf(-13.5), BigDecimal.valueOf(-72.0), 100);
        vuelo.setOrigen(origen);
        vuelo.setDestino(destino);
    }

    @Test
    void emitirTelemetria_shouldIncludeNodesWithColor() {
        when(nodoRepository.findAllByOrderByCodigoIataAsc()).thenReturn(List.of(nodo));
        when(vueloRepository.findByEstadoInAndEsPlantilla(anyList(), eq(false))).thenReturn(List.of());

        telemetriaService.emitirTelemetria(sesion);

        verify(telemetriaWebSocket).broadcast(jsonCaptor.capture());
        String json = jsonCaptor.getValue();

        assertTrue(json.contains("\"codigo_iata\":\"LIM\""), "Should include node IATA code");
        assertTrue(json.contains("\"ocupacion_pct\":45.0"), "Should include occupancy percentage");
        assertTrue(json.contains("\"color\":\"VERDE\""), "Node at 45% should be VERDE (<= 70)");
    }

    @Test
    void emitirTelemetria_shouldIncludeFlightsWithInterpolatedPosition() {
        when(nodoRepository.findAllByOrderByCodigoIataAsc()).thenReturn(List.of(nodo));
        when(vueloRepository.findByEstadoInAndEsPlantilla(anyList(), eq(false))).thenReturn(List.of(vuelo));

        telemetriaService.emitirTelemetria(sesion);

        verify(telemetriaWebSocket).broadcast(jsonCaptor.capture());
        String json = jsonCaptor.getValue();

        assertTrue(json.contains("\"codigo_vuelo\":\"LA2001\""), "Should include flight code");
        assertTrue(json.contains("\"estado\":\"EN_RUTA\""), "Should include flight state");
        assertTrue(json.contains("lat_actual"), "Should include interpolated lat");
        assertTrue(json.contains("lon_actual"), "Should include interpolated lon");
    }

    @Test
    void emitirTelemetria_shouldIncludeSessionMetrics() {
        when(nodoRepository.findAllByOrderByCodigoIataAsc()).thenReturn(List.of(nodo));
        when(vueloRepository.findByEstadoInAndEsPlantilla(anyList(), eq(false))).thenReturn(List.of());

        telemetriaService.emitirTelemetria(sesion);

        verify(telemetriaWebSocket).broadcast(jsonCaptor.capture());
        String json = jsonCaptor.getValue();

        assertTrue(json.contains("\"metricas_sesion\""), "Should contain metricas_sesion object");
        assertTrue(json.contains("\"vuelos_cancelados\":2"), "Should include cancelled flights count");
        assertTrue(json.contains("\"maletas_replanificadas\":5"), "Should include replanned baggage count");
        assertTrue(json.contains("\"sla_acumulado_pct\":95.5"), "Should include SLA percentage");
    }

    @Test
    void emitirTelemetria_shouldCalculateNodeColorCorrectly() {
        nodo.setOcupacionActual(75);

        when(nodoRepository.findAllByOrderByCodigoIataAsc()).thenReturn(List.of(nodo));
        when(vueloRepository.findByEstadoInAndEsPlantilla(anyList(), eq(false))).thenReturn(List.of());

        telemetriaService.emitirTelemetria(sesion);

        verify(telemetriaWebSocket).broadcast(jsonCaptor.capture());
        String json = jsonCaptor.getValue();

        assertTrue(json.contains("\"color\":\"AMBAR\""),
                "Node at 75% should be AMBAR (between 70 and 90)");
    }

    @Test
    void emitirTelemetria_shouldCalculateNodeColorRedWhenOverThreshold() {
        nodo.setOcupacionActual(95);

        when(nodoRepository.findAllByOrderByCodigoIataAsc()).thenReturn(List.of(nodo));
        when(vueloRepository.findByEstadoInAndEsPlantilla(anyList(), eq(false))).thenReturn(List.of());

        telemetriaService.emitirTelemetria(sesion);

        verify(telemetriaWebSocket).broadcast(jsonCaptor.capture());
        String json = jsonCaptor.getValue();

        assertTrue(json.contains("\"color\":\"ROJO\""),
                "Node at 95% should be ROJO (> 90)");
    }

    @Test
    void emitirTelemetria_shouldCalculateFlightColor() {
        vuelo.setCargaDisponible(4);

        when(nodoRepository.findAllByOrderByCodigoIataAsc()).thenReturn(List.of(nodo));
        when(vueloRepository.findByEstadoInAndEsPlantilla(anyList(), eq(false))).thenReturn(List.of(vuelo));

        telemetriaService.emitirTelemetria(sesion);

        verify(telemetriaWebSocket).broadcast(jsonCaptor.capture());
        String json = jsonCaptor.getValue();

        assertTrue(json.contains("\"color\":\"ROJO\""),
                "Flight at 90% occupancy should be ROJO (> 70)");
    }

    @Test
    void emitirTelemetria_shouldNotFailWithNoSessions() {
        when(nodoRepository.findAllByOrderByCodigoIataAsc()).thenReturn(List.of());
        when(vueloRepository.findByEstadoInAndEsPlantilla(anyList(), eq(false))).thenReturn(List.of());

        telemetriaService.emitirTelemetria(sesion);

        verify(telemetriaWebSocket).broadcast(anyString());
    }
}
