package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.*;
import com.tasfb2b.backend.bc1.infrastructure.NodoLogisticoRepository;
import com.tasfb2b.backend.bc1.infrastructure.VueloRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class MotorEnrutamiento {

    private final VueloRepository vueloRepository;
    private final NodoLogisticoRepository nodoRepository;

    public MotorEnrutamiento(VueloRepository vueloRepository, NodoLogisticoRepository nodoRepository) {
        this.vueloRepository = vueloRepository;
        this.nodoRepository = nodoRepository;
    }

    public RutaResult calcularRuta(NodoLogistico origen, String destinoIata, OffsetDateTime slaComprometido) {
        NodoLogistico destino = nodoRepository.findByCodigoIata(destinoIata)
                .orElse(null);
        if (destino == null) {
            return RutaResult.sinRuta("Destino IATA no encontrado: " + destinoIata);
        }

        List<Vuelo> programados = vueloRepository.findByEstado(EstadoVuelo.PROGRAMADO,
                org.springframework.data.domain.Pageable.unpaged()).getContent();

        Vuelo directo = buscarVueloDirecto(programados, origen.getId(), destino.getId(), slaComprometido);
        if (directo != null) {
            List<SegmentoInfo> segmentos = new ArrayList<>();
            segmentos.add(new SegmentoInfo(1, directo.getId(), directo.getCodigoVuelo(),
                    origen.getId(), origen.getCodigoIata(),
                    destino.getId(), destino.getCodigoIata(),
                    directo.getHoraSalida(), directo.getHoraLlegada()));
            return new RutaResult(segmentos, true, null);
        }

        List<SegmentoInfo> conexion = buscarConexion(programados, origen.getId(), destino.getId(), slaComprometido);
        if (!conexion.isEmpty()) {
            return new RutaResult(conexion, true, null);
        }

        return RutaResult.sinRuta("No se encontro ruta de " + origen.getCodigoIata() + " a " + destinoIata);
    }

    private Vuelo buscarVueloDirecto(List<Vuelo> vuelos, UUID origenId, UUID destinoId, OffsetDateTime sla) {
        return vuelos.stream()
                .filter(v -> v.getOrigen().getId().equals(origenId))
                .filter(v -> v.getDestino().getId().equals(destinoId))
                .filter(v -> v.getCargaDisponible() > 0)
                .filter(v -> v.getHoraLlegada().isBefore(sla) || v.getHoraLlegada().equals(sla))
                .min(Comparator.comparing(Vuelo::getHoraSalida))
                .orElse(null);
    }

    private List<SegmentoInfo> buscarConexion(List<Vuelo> vuelos, UUID origenId, UUID destinoId, OffsetDateTime sla) {
        List<Vuelo> primeros = vuelos.stream()
                .filter(v -> v.getOrigen().getId().equals(origenId))
                .filter(v -> v.getCargaDisponible() > 0)
                .sorted(Comparator.comparing(Vuelo::getHoraSalida))
                .toList();

        for (Vuelo primero : primeros) {
            List<Vuelo> segundos = vuelos.stream()
                    .filter(v -> v.getOrigen().getId().equals(primero.getDestino().getId()))
                    .filter(v -> v.getDestino().getId().equals(destinoId))
                    .filter(v -> v.getCargaDisponible() > 0)
                    .filter(v -> v.getHoraSalida().isAfter(primero.getHoraLlegada())
                            || v.getHoraSalida().equals(primero.getHoraLlegada()))
                    .filter(v -> java.time.Duration.between(primero.getHoraLlegada(), v.getHoraSalida()).toMinutes() >= 60)
                    .filter(v -> v.getHoraLlegada().isBefore(sla) || v.getHoraLlegada().equals(sla))
                    .sorted(Comparator.comparing(Vuelo::getHoraSalida))
                    .toList();

            if (!segundos.isEmpty()) {
                Vuelo segundo = segundos.get(0);
                List<SegmentoInfo> segmentos = new ArrayList<>();
                segmentos.add(new SegmentoInfo(1, primero.getId(), primero.getCodigoVuelo(),
                        primero.getOrigen().getId(), primero.getOrigen().getCodigoIata(),
                        primero.getDestino().getId(), primero.getDestino().getCodigoIata(),
                        primero.getHoraSalida(), primero.getHoraLlegada()));
                segmentos.add(new SegmentoInfo(2, segundo.getId(), segundo.getCodigoVuelo(),
                        segundo.getOrigen().getId(), segundo.getOrigen().getCodigoIata(),
                        segundo.getDestino().getId(), segundo.getDestino().getCodigoIata(),
                        segundo.getHoraSalida(), segundo.getHoraLlegada()));
                return segmentos;
            }
        }

        return List.of();
    }

    public record SegmentoInfo(
            int orden,
            UUID vueloId,
            String vueloCodigo,
            UUID nodoOrigenId,
            String nodoOrigenIata,
            UUID nodoDestinoId,
            String nodoDestinoIata,
            OffsetDateTime horaSalida,
            OffsetDateTime horaLlegada
    ) {}

    public record RutaResult(
            List<SegmentoInfo> segmentos,
            boolean exitoso,
            String mensajeError
    ) {
        public static RutaResult sinRuta(String error) {
            return new RutaResult(List.of(), false, error);
        }
    }
}
