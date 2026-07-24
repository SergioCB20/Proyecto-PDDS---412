package com.tasfb2b.backend.bc2.application;

import com.tasfb2b.backend.bc1.domain.NodoLogistico;
import com.tasfb2b.backend.bc1.domain.Vuelo;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@Qualifier("greedyRoutingStrategy")
public class GreedyRoutingStrategy implements RoutingStrategy {

    private static final long MIN_CONEXION_MINUTOS = 60;

    /**
     * Indice espacial sobre la lista de vuelos PROGRAMADO: agrupa por origen y por destino
     * una sola vez para que el calculo greedy sea O(origen+destination) por equipaje en vez
     * de O(N) por equipaje. Reduccion de 16s/batch a <500ms cuando hay 11263 vuelos.
     */
    public record VuelosIndex(
            Map<UUID, List<Vuelo>> porOrigen,
            Map<UUID, List<Vuelo>> porDestino,
            int totalVivos
    ) {
        public static VuelosIndex from(List<Vuelo> vuelos) {
            Map<UUID, List<Vuelo>> po = new HashMap<>(64);
            Map<UUID, List<Vuelo>> pd = new HashMap<>(64);
            int vivos = 0;
            for (Vuelo v : vuelos) {
                if (v.getCargaDisponible() == null || v.getCargaDisponible() <= 0) continue;
                if (v.getHoraSalida() == null || v.getHoraLlegada() == null) continue;
                UUID oid = v.getOrigen() != null ? v.getOrigen().getId() : null;
                UUID did = v.getDestino() != null ? v.getDestino().getId() : null;
                if (oid == null || did == null) continue;
                po.computeIfAbsent(oid, k -> new ArrayList<>()).add(v);
                pd.computeIfAbsent(did, k -> new ArrayList<>()).add(v);
                vivos++;
            }
            Comparator<Vuelo> porSalida = Comparator.comparing(Vuelo::getHoraSalida);
            for (List<Vuelo> l : po.values()) l.sort(porSalida);
            for (List<Vuelo> l : pd.values()) l.sort(porSalida);
            return new VuelosIndex(po, pd, vivos);
        }

        public boolean empty() { return totalVivos == 0; }
    }

    @Override
    public RutaResult calcularRuta(NodoLogistico origen, NodoLogistico destino,
                                   OffsetDateTime slaComprometido, List<Vuelo> vuelosProgramados) {
        if (vuelosProgramados == null || vuelosProgramados.isEmpty()) {
            return RutaResult.sinRuta("No hay vuelos disponibles");
        }
        VuelosIndex idx = VuelosIndex.from(vuelosProgramados);
        return calcularRutaIndexado(origen, destino, slaComprometido, idx);
    }

    public RutaResult calcularRutaIndexado(NodoLogistico origen, NodoLogistico destino,
                                           OffsetDateTime slaComprometido, VuelosIndex idx) {
        if (idx.empty()) {
            return RutaResult.sinRuta("No hay vuelos disponibles");
        }
        SegmentoInfo directo = buscarDirectoIdx(origen.getId(), destino.getId(),
                slaComprometido, idx);
        if (directo != null) {
            return new RutaResult(List.of(directo), true, null);
        }
        List<SegmentoInfo> conexion = buscarConexionIdx(origen.getId(), destino.getId(),
                slaComprometido, idx);
        if (!conexion.isEmpty()) {
            return new RutaResult(conexion, true, null);
        }
        return RutaResult.sinRuta("No se encontro ruta de " + origen.getCodigoIata()
                + " a " + destino.getCodigoIata());
    }

    private SegmentoInfo buscarDirectoIdx(UUID origenId, UUID destinoId, OffsetDateTime sla,
                                          VuelosIndex idx) {
        List<Vuelo> candidatos = idx.porOrigen().get(origenId);
        if (candidatos == null) return null;
        SegmentoInfo mejor = null;
        OffsetDateTime mejorSalida = null;
        for (Vuelo v : candidatos) {
            if (!v.getDestino().getId().equals(destinoId)) continue;
            if (v.getHoraLlegada().isAfter(sla)) continue;
            if (mejorSalida == null || v.getHoraSalida().isBefore(mejorSalida)) {
                mejor = new SegmentoInfo(1, v.getId(), v.getCodigoVuelo(),
                        v.getOrigen().getId(), v.getOrigen().getCodigoIata(),
                        v.getDestino().getId(), v.getDestino().getCodigoIata(),
                        v.getHoraSalida(), v.getHoraLlegada());
                mejorSalida = v.getHoraSalida();
            }
        }
        return mejor;
    }

    private List<SegmentoInfo> buscarConexionIdx(UUID origenId, UUID destinoId, OffsetDateTime sla,
                                                 VuelosIndex idx) {
        List<Vuelo> primeros = idx.porOrigen().get(origenId);
        if (primeros == null || primeros.isEmpty()) return List.of();

        for (Vuelo primero : primeros) {
            UUID escalaId = primero.getDestino().getId();
            List<Vuelo> candidatosEscala = idx.porOrigen().get(escalaId);
            if (candidatosEscala == null) continue;

            Vuelo mejorConexion = null;
            for (Vuelo v : candidatosEscala) {
                if (!v.getDestino().getId().equals(destinoId)) continue;
                if (!v.getHoraSalida().isAfter(primero.getHoraLlegada())) continue;
                long minutos = Duration.between(primero.getHoraLlegada(), v.getHoraSalida()).toMinutes();
                if (minutos < MIN_CONEXION_MINUTOS) continue;
                if (v.getHoraLlegada().isAfter(sla)) continue;
                if (mejorConexion == null || v.getHoraSalida().isBefore(mejorConexion.getHoraSalida())) {
                    mejorConexion = v;
                }
            }
            if (mejorConexion != null) {
                return List.of(
                        new SegmentoInfo(1, primero.getId(), primero.getCodigoVuelo(),
                                primero.getOrigen().getId(), primero.getOrigen().getCodigoIata(),
                                primero.getDestino().getId(), primero.getDestino().getCodigoIata(),
                                primero.getHoraSalida(), primero.getHoraLlegada()),
                        new SegmentoInfo(2, mejorConexion.getId(), mejorConexion.getCodigoVuelo(),
                                mejorConexion.getOrigen().getId(), mejorConexion.getOrigen().getCodigoIata(),
                                mejorConexion.getDestino().getId(), mejorConexion.getDestino().getCodigoIata(),
                                mejorConexion.getHoraSalida(), mejorConexion.getHoraLlegada())
                );
            }
        }
        return List.of();
    }
}
