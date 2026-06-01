package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Component
@Qualifier("greedyRoutingStrategy")
public class GreedyRoutingStrategy implements RoutingStrategy {

    private static final long MIN_CONEXION_MINUTOS = 60;

    @Override
    public RutaResult calcularRuta(NodoLogistico origen, NodoLogistico destino,
                                    OffsetDateTime slaComprometido, List<Vuelo> vuelosProgramados, int cantidad) {
        Vuelo directo = buscarVueloDirecto(vuelosProgramados, origen.getId(), destino.getId(), slaComprometido, cantidad);
        if (directo != null) {
            List<SegmentoInfo> segmentos = new ArrayList<>();
            segmentos.add(new SegmentoInfo(1, directo.getId(), directo.getCodigoVuelo(),
                    origen.getId(), origen.getCodigoIata(),
                    destino.getId(), destino.getCodigoIata(),
                    directo.getHoraSalida(), directo.getHoraLlegada()));
            return new RutaResult(segmentos, true, null);
        }

        List<SegmentoInfo> conexion = buscarConexion(vuelosProgramados, origen.getId(), destino.getId(), slaComprometido);
        if (!conexion.isEmpty()) {
            return new RutaResult(conexion, true, null);
        }

        return RutaResult.sinRuta("No se encontro ruta de " + origen.getCodigoIata() + " a " + destino.getCodigoIata());
    }

    private Vuelo buscarVueloDirecto(List<Vuelo> vuelos, java.util.UUID origenId, java.util.UUID destinoId, OffsetDateTime sla, int cantidad) {
        return vuelos.stream()
                .filter(v -> v.getOrigen().getId().equals(origenId))
                .filter(v -> v.getDestino().getId().equals(destinoId))
                .filter(v -> v.getCargaDisponible() >= cantidad)
                .filter(v -> v.getHoraLlegada().isBefore(sla) || v.getHoraLlegada().equals(sla))
                .min(Comparator.comparing(Vuelo::getHoraSalida))
                .orElse(null);
    }

    private List<SegmentoInfo> buscarConexion(List<Vuelo> vuelos, java.util.UUID origenId,
                                               java.util.UUID destinoId, OffsetDateTime sla) {
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
                    .filter(v -> Duration.between(primero.getHoraLlegada(), v.getHoraSalida()).toMinutes() >= MIN_CONEXION_MINUTOS)
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

}
